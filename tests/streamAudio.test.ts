import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { StreamAudioCapture } from "../src/plugins/streamAudioDevice.desktop/capture";
import { NativeStreamAudio, type NativeStreamConnection } from "../src/plugins/streamAudioDevice.desktop/nativeCapture";

class Track extends EventTarget {
    readyState = "live";
    constructor(readonly kind: string) { super(); }
    stop() { this.readyState = "ended"; }
    disconnect() { this.readyState = "ended"; this.dispatchEvent(new Event("ended")); }
}
class Stream extends EventTarget {
    constructor(private tracks: Track[]) { super(); }
    getTracks() { return [...this.tracks]; }
    getVideoTracks() { return this.tracks.filter(t => t.kind === "video"); }
    getAudioTracks() { return this.tracks.filter(t => t.kind === "audio"); }
    addTrack(track: Track) { this.tracks.push(track); }
    removeTrack(track: Track) { this.tracks = this.tracks.filter(t => t !== track); }
}
const asStream = (s: Stream) => s as unknown as MediaStream;
const setup = () => {
    const video = new Track("video"), loopback = new Track("audio"), input = new Track("audio");
    const screen = new Stream([video, loopback]);
    const errors: string[] = [];
    return { video, loopback, input, screen, errors, capture: new StreamAudioCapture(e => errors.push(e)) };
};

test("replacement removes loopback, uses the exact device without voice processing, and ends with video", async () => {
    const { video, loopback, input, screen, capture } = setup();
    const voiceChat = new Track("audio");
    await capture.capture(Promise.resolve(asStream(screen)), "wave-link", async constraints => {
        assert.equal(loopback.readyState, "ended");
        assert.deepEqual(constraints, { video: false, audio: {
            deviceId: { exact: "wave-link" }, echoCancellation: false, noiseSuppression: false, autoGainControl: false
        } });
        return asStream(new Stream([input]));
    });
    assert.deepEqual(screen.getAudioTracks(), [input]);
    video.stop();
    assert.equal(input.readyState, "ended");
    assert.equal(voiceChat.readyState, "live");
    capture.stop(); // Idempotent after Discord stopped the video.
});

test("permission failure closes screen and loopback without falling back", async () => {
    const { video, loopback, screen, capture, errors } = setup();
    await assert.rejects(capture.capture(Promise.resolve(asStream(screen)), "missing", async () => { throw new Error("denied"); }));
    assert.equal(video.readyState, "ended");
    assert.equal(loopback.readyState, "ended");
    assert.equal(errors.length, 1);
});

test("unplugging input ends the share and reports the loss", async () => {
    const { video, input, screen, capture, errors } = setup();
    await capture.capture(Promise.resolve(asStream(screen)), "mic", async () => asStream(new Stream([input])));
    input.disconnect();
    assert.equal(video.readyState, "ended");
    assert.equal(errors.length, 1);
});

test("disabling while permission is pending releases late-arriving input", async () => {
    const { video, input, screen, capture } = setup();
    let resolve!: (s: MediaStream) => void;
    const pending = capture.capture(Promise.resolve(asStream(screen)), "mic", () => new Promise(r => { resolve = r; }));
    await Promise.resolve();
    capture.stop();
    resolve(asStream(new Stream([input])));
    await assert.rejects(pending);
    assert.equal(input.readyState, "ended");
    assert.equal(video.readyState, "ended");
});

test("screen ending while input is pending never returns a live microphone", async () => {
    const { video, input, screen, capture } = setup();
    let resolve!: (s: MediaStream) => void;
    const pending = capture.capture(Promise.resolve(asStream(screen)), "mic", () => new Promise(r => { resolve = r; }));
    await Promise.resolve();
    video.stop();
    resolve(asStream(new Stream([input])));
    await assert.rejects(pending);
    assert.equal(input.readyState, "ended");
});

function nativeSetup() {
    const calls: unknown[] = [];
    const connection: NativeStreamConnection = {
        context: "stream", userId: "self", streamUserId: "self",
        conn: {
            setGoLiveDevices: options => { calls.push(options); },
            clearGoLiveDevices: () => { calls.push("clear-input"); },
            clearDesktopSource: () => { calls.push("clear-video"); }
        },
        setSoundshareSource: (id, active) => { calls.push([id, active]); }
    };
    const source = { desktopDescription: { id: "screen:1", soundshareId: 123, useLoopback: true }, quality: { resolution: 1080 } };
    return { calls, connection, source, capture: new NativeStreamAudio() };
}

test("native input belongs only to our stream, never voice chat or an incoming stream", () => {
    const { connection, source, capture, calls } = nativeSetup();
    connection.context = "default";
    assert.equal(capture.prepare(connection, source, "mic", true), source);
    connection.context = "stream";
    connection.streamUserId = "other-user";
    assert.equal(capture.prepare(connection, source, "mic", true), source);
    assert.deepEqual(calls, []);
});

test("native replacement preserves video source and quality, suppresses loopback, and releases input", () => {
    const { connection, source, capture, calls } = nativeSetup();
    const result = capture.prepare(connection, source, "wave-guid", true);
    assert.equal(result.desktopDescription.id, "screen:1");
    assert.equal(result.quality, source.quality);
    assert.equal(result.desktopDescription.useLoopback, false);
    assert.equal(source.desktopDescription.useLoopback, true);
    assert.deepEqual(calls, [[0, false], { audioInputDeviceId: "wave-guid" }]);
    capture.prepare(connection, source, "wave-guid", true);
    assert.equal(calls.length, 2);
    capture.release(connection);
    assert.equal(calls.at(-1), "clear-input");
});

test("missing native input and unsupported interface fail closed", () => {
    for (const missingDevice of [true, false]) {
        const { connection, source, capture, calls } = nativeSetup();
        if (!missingDevice) delete connection.conn.setGoLiveDevices;
        assert.throws(() => capture.prepare(connection, source, "mic", !missingDevice));
        assert.deepEqual(calls, [[0, false], "clear-video"]);
    }
});

test("native default passes through and unplugging removes only owned capture", () => {
    const { connection, source, capture, calls } = nativeSetup();
    assert.equal(capture.prepare(connection, source, "", true), source);
    assert.deepEqual(calls, []);
    capture.prepare(connection, source, "mic", true);
    assert.equal(capture.removeUnavailable(new Set()), true);
    assert.deepEqual(calls.slice(-2), ["clear-input", "clear-video"]);
    assert.equal(capture.removeUnavailable(new Set()), false);
});

test("source integration patches match the inspected public Discord build", { skip: !process.env.DISCORD_BUNDLE }, () => {
    const code = readFileSync(process.env.DISCORD_BUNDLE!, "utf8");
    const patterns = [
        /setGoLiveSource\(([A-Za-z_$][\w$]*)\)\{(?=let\{resolution:)/,
        /clearDesktopSource\(\)\{(?=this\.goLiveSourceIdentifier)/,
        /this\.conn\.destroy\([A-Za-z_$][\w$]*\)/,
        /(?<=children:\[)(?=[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*:null,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*\])/
    ];
    for (const pattern of patterns) assert.ok(pattern.test(code), `No match: ${pattern}`);
});
