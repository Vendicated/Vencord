#include "native_messaging.hpp"

#include <cstdint>

#include "protocol.hpp"

#ifdef _WIN32
#include <windows.h>
#else
#include <cerrno>
#include <unistd.h>
#endif

namespace {

// Return the number of bytes that the call transferred. Return 0 at the end of the stream or on an error.
size_t transfer(bool write, char* bytes, size_t size) {
#ifdef _WIN32
    HANDLE handle = GetStdHandle(write ? STD_OUTPUT_HANDLE : STD_INPUT_HANDLE);
    DWORD done = 0;
    const BOOL ok = write
        ? WriteFile(handle, bytes, (DWORD)size, &done, nullptr)
        : ReadFile(handle, bytes, (DWORD)size, &done, nullptr);
    return ok ? done : 0;
#else
    while (true) {
        const ssize_t done = write ? ::write(STDOUT_FILENO, bytes, size) : ::read(STDIN_FILENO, bytes, size);
        if (done >= 0) return (size_t)done;
        if (errno != EINTR) return 0;
    }
#endif
}

bool transferExact(bool write, void* data, size_t size) {
    auto* bytes = static_cast<char*>(data);

    for (size_t offset = 0; offset < size;) {
        const size_t done = transfer(write, bytes + offset, size - offset);
        if (done == 0) return false;
        offset += done;
    }

    return true;
}

}  // namespace

bool NativeMessaging::read(std::string& message) {
    // Native messaging uses the native byte order for the length.
    uint32_t length;
    if (!transferExact(false, &length, sizeof(length)) || length > MAX_NATIVE_MESSAGE) return false;

    message.resize(length);
    return transferExact(false, message.data(), length);
}

void NativeMessaging::write(const std::string& json) {
    const uint32_t length = (uint32_t)json.size();
    std::string frame(reinterpret_cast<const char*>(&length), sizeof(length));
    frame += json;

    std::lock_guard lock(writeMutex);
    if (!closed && !transferExact(true, frame.data(), frame.size())) closed = true;
}
