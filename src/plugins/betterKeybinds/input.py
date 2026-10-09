"""Private evdev-to-JSON-lines bridge for the BetterKeybinds plugin.

The renderer owns the process and supplies the only output filter over stdin. This
module never grabs devices, records input to disk, or sends input over a socket.
"""

import errno
import fcntl
import glob
import json
import os
import selectors
import signal
import struct
import sys
import time


EV_SYN = 0
EV_KEY = 1
EV_REL = 2
SYN_REPORT = 0
SYN_DROPPED = 3
REL_HWHEEL = 6
REL_WHEEL = 8
BTN_MISC = 0x100
KEY_MAX = 0x2FF
BTN_LEFT = 0x110
BTN_RIGHT = 0x111
BTN_MIDDLE = 0x112
BTN_SIDE = 0x113
BTN_EXTRA = 0x114
BTN_FORWARD = 0x115
BTN_BACK = 0x116
MOUSE_BUTTONS = {
    BTN_LEFT: 1,
    BTN_MIDDLE: 2,
    BTN_RIGHT: 3,
    BTN_SIDE: 8,
    BTN_BACK: 8,
    BTN_EXTRA: 9,
    BTN_FORWARD: 9,
}
EVENT = struct.Struct("@llHHi")
KEY_BYTES = (KEY_MAX + 8) // 8
MAX_CONFIG = 65536
SCAN_INTERVAL = 2.0


def ioctl_read(number, length):
    # Linux _IOC(_IOC_READ, 'E', number, length).
    return (2 << 30) | (length << 16) | (ord("E") << 8) | number


def bits(fd, number, length):
    data = bytearray(length)
    fcntl.ioctl(fd, ioctl_read(number, length), data, True)
    return data


def has_bit(data, bit):
    return bit // 8 < len(data) and bool(data[bit // 8] & (1 << (bit % 8)))


def mapped_key(code):
    if 0 < code < BTN_MISC:
        return (0, code + 8)
    button = MOUSE_BUTTONS.get(code)
    return (1, button) if button is not None else None


def capabilities(fd):
    types = bits(fd, 0x20, 4)
    if not has_bit(types, EV_KEY):
        return None
    keys = bits(fd, 0x20 + EV_KEY, KEY_BYTES)
    keyboard = any(has_bit(keys, code) for code in range(1, BTN_MISC))
    mouse = any(has_bit(keys, code) for code in MOUSE_BUTTONS)
    if not (keyboard or mouse):
        return None
    rel = bits(fd, 0x20 + EV_REL, 2) if has_bit(types, EV_REL) else bytearray(2)
    return keyboard, mouse, has_bit(rel, REL_WHEEL), has_bit(rel, REL_HWHEEL)


def physical_keys(fd, keyboard, mouse):
    pressed = bits(fd, 0x18, KEY_BYTES)
    return {
        code for code in range(1, KEY_MAX + 1)
        if has_bit(pressed, code) and (
            (keyboard and code < BTN_MISC) or (mouse and code in MOUSE_BUTTONS)
        )
    }

def drain(fd):
    while True:
        try:
            if not os.read(fd, EVENT.size * 128):
                raise OSError(errno.ENODEV, "Input device disconnected")
        except BlockingIOError:
            return


def config_from_line(line):
    if len(line) > MAX_CONFIG:
        raise ValueError("Input configuration exceeds 64 KiB")
    value = json.loads(line)
    if not isinstance(value, dict) or type(value.get("capture")) is not bool:
        raise ValueError("Expected watch and boolean capture in input configuration")
    entries = value.get("watch")
    if not isinstance(entries, list) or len(entries) > 4096:
        raise ValueError("Invalid input watch list")
    watch = set()
    for entry in entries:
        if (not isinstance(entry, list) or len(entry) != 2
                or any(type(part) is not int for part in entry)):
            raise ValueError("Invalid input watch entry")
        kind, code = entry
        if not ((kind == 0 and 8 < code < BTN_MISC + 8)
                or (kind == 1 and 1 <= code <= 9)):
            raise ValueError("Input watch entry outside supported key range")
        watch.add((kind, code))
    return watch, value["capture"]


class Device:
    def __init__(self, fd, identity, capabilities_, held):
        self.fd = fd
        self.identity = identity
        self.keyboard, self.mouse, self.wheel, self.hwheel = capabilities_
        self.held = held
        self.partial = bytearray()
        self.dropped = False


class Reader:
    def __init__(self):
        self.selector = selectors.DefaultSelector()
        self.devices = {}
        self.skipped = {}
        self.counts = {}
        self.watch = set()
        self.capture = False
        self.stdin_buffer = bytearray()
        self.stopping = False
        self.permission_denied = False

    def emit(self, value):
        sys.stdout.write(json.dumps(value, separators=(",", ":")) + "\n")
        sys.stdout.flush()

    def visible(self, key):
        return self.capture or key in self.watch

    def rebuild(self):
        self.counts.clear()
        for device in self.devices.values():
            for code in device.held:
                key = mapped_key(code)
                if key is not None:
                    self.counts[key] = self.counts.get(key, 0) + 1

    def resync(self, reason):
        for path, device in list(self.devices.items()):
            try:
                drain(device.fd)
                device.held = physical_keys(device.fd, device.keyboard, device.mouse)
                device.dropped = False
                device.partial.clear()
            except OSError:
                self.remove(path, reset=False)
        self.rebuild()
        self.emit({"type": "reset", "reason": reason})

    def remove(self, path, reset=True):
        device = self.devices.pop(path, None)
        if device is None:
            return
        try:
            self.selector.unregister(device.fd)
        except (OSError, KeyError):
            pass
        os.close(device.fd)
        if reset:
            self.resync("Input device disconnected")

    def scan(self):
        present = set(glob.glob("/dev/input/event*"))
        for path in list(self.devices):
            device = self.devices[path]
            try:
                stat = os.stat(path)
                same = (stat.st_dev, stat.st_ino, stat.st_rdev) == device.identity
            except OSError:
                same = False
            if path not in present or not same:
                self.remove(path)
        for path in self.skipped.keys() - present:
            del self.skipped[path]
        for path in sorted(present - self.devices.keys()):
            try:
                stat = os.stat(path)
            except OSError:
                continue
            identity = (stat.st_dev, stat.st_ino, stat.st_rdev)
            if self.skipped.get(path) == identity:
                continue
            try:
                fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | os.O_CLOEXEC)
            except OSError as exc:
                if exc.errno in (errno.EACCES, errno.EPERM):
                    self.permission_denied = True
                    self.skipped[path] = identity
                continue
            try:
                caps = capabilities(fd)
                if caps is None:
                    self.skipped[path] = identity
                    os.close(fd)
                    continue
                drain(fd)
                held = physical_keys(fd, caps[0], caps[1])
                device = Device(fd, identity, caps, held)
                self.selector.register(fd, selectors.EVENT_READ, path)
                self.devices[path] = device
                self.skipped.pop(path, None)
                for code in held:
                    key = mapped_key(code)
                    if key is not None:
                        self.counts[key] = self.counts.get(key, 0) + 1
            except OSError as exc:
                if exc.errno in (errno.EACCES, errno.EPERM):
                    self.permission_denied = True
                os.close(fd)

    def key_event(self, device, code, value, events):
        if value not in (0, 1):  # Kernel auto-repeat must not retrigger a hotkey.
            return
        if not ((device.keyboard and 0 < code < BTN_MISC)
                or (device.mouse and code in MOUSE_BUTTONS)):
            return
        was_down = code in device.held
        if was_down == bool(value):
            return
        key = mapped_key(code)
        if value:
            device.held.add(code)
            count = self.counts.get(key, 0)
            self.counts[key] = count + 1
            if count == 0 and self.visible(key):
                events.append([key[0], key[1], True])
        else:
            device.held.remove(code)
            count = self.counts[key] - 1
            if count:
                self.counts[key] = count
            else:
                del self.counts[key]
                if self.visible(key):
                    events.append([key[0], key[1], False])

    def relative_event(self, device, code, value, events):
        if not value or not device.mouse:
            return
        if code == REL_WHEEL and device.wheel:
            button = 4 if value > 0 else 5
        elif code == REL_HWHEEL and device.hwheel:
            button = 7 if value > 0 else 6
        else:
            return
        key = (1, button)
        if self.visible(key):
            for _ in range(min(abs(value), 32)):
                events.append([1, button, True])
                events.append([1, button, False])

    def read_device(self, path):
        device = self.devices.get(path)
        if device is None:
            return
        try:
            chunk = os.read(device.fd, EVENT.size * 128)
            if not chunk:
                self.remove(path)
                return
        except BlockingIOError:
            return
        except OSError:
            self.remove(path)
            return
        device.partial.extend(chunk)
        events = []
        length = len(device.partial) // EVENT.size * EVENT.size
        for offset in range(0, length, EVENT.size):
            _, _, kind, code, value = EVENT.unpack_from(device.partial, offset)
            if kind == EV_SYN and code == SYN_DROPPED:
                device.dropped = True
                events.clear()
            elif device.dropped:
                if kind == EV_SYN and code == SYN_REPORT:
                    self.resync("Input event stream lost synchronization")
                    return
            elif kind == EV_KEY:
                self.key_event(device, code, value, events)
            elif kind == EV_REL:
                self.relative_event(device, code, value, events)
            if len(events) >= 256:
                self.emit({"type": "input", "events": events})
                events.clear()
        del device.partial[:length]
        if events:
            self.emit({"type": "input", "events": events})

    def read_stdin(self):
        chunk = os.read(sys.stdin.fileno(), 4096)
        if not chunk:
            self.stopping = True
            return
        self.stdin_buffer.extend(chunk)
        if len(self.stdin_buffer) > MAX_CONFIG:
            raise ValueError("Input configuration exceeds 64 KiB")
        while (end := self.stdin_buffer.find(b"\n")) >= 0:
            line = bytes(self.stdin_buffer[:end])
            del self.stdin_buffer[:end + 1]
            self.watch, self.capture = config_from_line(line)

    def run(self):
        os.set_blocking(sys.stdin.fileno(), False)
        self.selector.register(sys.stdin.fileno(), selectors.EVENT_READ, None)
        self.scan()
        if not self.devices:
            cause = ("Permission denied reading /dev/input/event*; input-group access may "
                     "require a new login" if self.permission_denied else
                     "No readable keyboard or mouse found in /dev/input/event*")
            self.emit({"type": "error", "message": cause})
            return
        self.emit({"type": "ready", "devices": len(self.devices)})
        next_scan = time.monotonic() + SCAN_INTERVAL
        while not self.stopping:
            for key, _ in self.selector.select(max(0, next_scan - time.monotonic())):
                if key.data is None:
                    self.read_stdin()
                elif not self.stopping:
                    self.read_device(key.data)
            if time.monotonic() >= next_scan:
                self.scan()
                next_scan = time.monotonic() + SCAN_INTERVAL

    def close(self):
        for path in list(self.devices):
            self.remove(path, reset=False)
        self.selector.close()


def main():
    reader = Reader()

    def stop(_signal, _frame):
        reader.stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        reader.run()
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        try:
            reader.emit({"type": "error", "message": str(exc)})
        except BrokenPipeError:
            pass
    except BrokenPipeError:
        pass
    finally:
        reader.close()


if __name__ == "__main__":
    main()
