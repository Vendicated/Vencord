#include "discord_ipc.hpp"

#include <bit>
#include <cstring>
#include <optional>
#include <string_view>

#include "json.hpp"
#include "log.hpp"
#include "protocol.hpp"

#ifdef _WIN32
#include <windows.h>
#else
#include <cerrno>
#include <cstdlib>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#endif

// The frame header is little endian. All supported platforms are little endian too.
static_assert(std::endian::native == std::endian::little);

namespace {

#ifdef _WIN32

const IpcHandle INVALID_HANDLE = INVALID_HANDLE_VALUE;

void closeHandle(IpcHandle handle) {
    CloseHandle(handle);
}

struct Event {
    HANDLE handle = CreateEventW(nullptr, TRUE, FALSE, nullptr);

    Event() = default;
    Event(const Event&) = delete;
    Event& operator=(const Event&) = delete;
    ~Event() {
        if (handle) CloseHandle(handle);
    }
};

bool transferExact(IpcHandle handle, void* data, size_t size, bool write) {
    Event event;
    if (!event.handle) return false;

    auto* bytes = static_cast<uint8_t*>(data);

    for (size_t offset = 0; offset < size;) {
        OVERLAPPED overlapped{};
        overlapped.hEvent = event.handle;

        DWORD done = 0;
        const DWORD length = (DWORD)(size - offset);
        const BOOL ok = write
            ? WriteFile(handle, bytes + offset, length, &done, &overlapped)
            : ReadFile(handle, bytes + offset, length, &done, &overlapped);

        if (!ok && (GetLastError() != ERROR_IO_PENDING || !GetOverlappedResult(handle, &overlapped, &done, TRUE))) {
            return false;
        }

        if (done == 0) return false;
        offset += done;
    }

    return true;
}

HANDLE createPipe(const std::wstring& name, bool first) {
    DWORD mode = PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED | (first ? FILE_FLAG_FIRST_PIPE_INSTANCE : 0);

    return CreateNamedPipeW(
        name.c_str(),
        mode,
        PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
        PIPE_UNLIMITED_INSTANCES,
        (DWORD)MAX_FRAME,
        (DWORD)MAX_FRAME,
        0,
        nullptr
    );
}

bool connectPipe(HANDLE pipe, const std::atomic<bool>& running) {
    Event event;
    if (!event.handle) return false;

    OVERLAPPED overlapped{};
    overlapped.hEvent = event.handle;

    if (ConnectNamedPipe(pipe, &overlapped)) return true;

    const DWORD error = GetLastError();
    if (error == ERROR_PIPE_CONNECTED) return true;
    if (error != ERROR_IO_PENDING) return false;

    while (running) {
        const DWORD wait = WaitForSingleObject(event.handle, 500);
        if (wait == WAIT_OBJECT_0) {
            DWORD bytes = 0;
            return GetOverlappedResult(pipe, &overlapped, &bytes, FALSE) != 0;
        }

        if (wait != WAIT_TIMEOUT) break;
    }

    CancelIoEx(pipe, &overlapped);
    return false;
}

#else

constexpr IpcHandle INVALID_HANDLE = -1;

void closeHandle(IpcHandle fd) {
    shutdown(fd, SHUT_RDWR);
    ::close(fd);
}

bool transferExact(IpcHandle fd, void* data, size_t size, bool write) {
    auto* bytes = static_cast<uint8_t*>(data);

    for (size_t offset = 0; offset < size;) {
        const ssize_t done = write ? ::write(fd, bytes + offset, size - offset) : ::read(fd, bytes + offset, size - offset);
        if (done < 0 && errno == EINTR) continue;
        if (done <= 0) return false;

        offset += (size_t)done;
    }

    return true;
}

std::optional<sockaddr_un> socketAddress(const std::string& path) {
    sockaddr_un address{};
    address.sun_family = AF_UNIX;
    if (path.size() >= sizeof(address.sun_path)) return std::nullopt;

    memcpy(address.sun_path, path.c_str(), path.size() + 1);
    return address;
}

int createSocket(const sockaddr_un& address) {
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    unlink(address.sun_path);
    if (bind(fd, reinterpret_cast<const sockaddr*>(&address), sizeof(address)) != 0 || listen(fd, 16) != 0) {
        close(fd);
        return -1;
    }

    return fd;
}

bool socketInUse(const sockaddr_un& address) {
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return true;

    bool inUse = connect(fd, reinterpret_cast<const sockaddr*>(&address), sizeof(address)) == 0;
    close(fd);
    return inUse;
}

std::string socketBase() {
    const char* runtime = getenv("XDG_RUNTIME_DIR");
    if (runtime) return runtime;

    const char* temp = getenv("TMPDIR");
    return temp ? temp : "/tmp";
}

#endif

bool readFrame(IpcHandle handle, int32_t& opcode, std::string& payload) {
    uint32_t header[2];
    if (!transferExact(handle, header, sizeof(header), false)) return false;

    const auto [op, length] = header;
    if (op > OP_PONG || length > MAX_FRAME) return false;

    opcode = (int32_t)op;
    payload.resize(length);
    return length == 0 || transferExact(handle, payload.data(), length, false);
}

bool writeFrame(IpcHandle handle, int32_t opcode, std::string_view payload) {
    const uint32_t header[2] = { (uint32_t)opcode, (uint32_t)payload.size() };

    std::string frame(reinterpret_cast<const char*>(header), sizeof(header));
    frame += payload;
    return transferExact(handle, frame.data(), frame.size(), true);
}

}  // namespace

struct DiscordIpc::Connection {
    uint64_t id = 0;
    IpcHandle handle = INVALID_HANDLE;
    std::mutex writeMutex;

    void close() {
        if (handle == INVALID_HANDLE) return;

        closeHandle(handle);
        handle = INVALID_HANDLE;
    }
};

DiscordIpc::DiscordIpc(IpcCallbacks& callbacks) : callbacks(callbacks) {}

DiscordIpc::~DiscordIpc() {
    stop();
}

bool DiscordIpc::start() {
    if (running) return true;

#ifdef _WIN32
    for (int i = 0; i < 10; i++) {
        const std::wstring name = L"\\\\.\\pipe\\discord-ipc-" + std::to_wstring(i);

        HANDLE pipe = createPipe(name, true);
        if (pipe == INVALID_HANDLE_VALUE) continue;

        pipeName = name;
        listener = pipe;
        running = true;
        acceptThread = std::thread(&DiscordIpc::acceptLoop, this);
        logMessage("[ipc] Listening on discord-ipc-%d", i);
        return true;
    }
#else
    const std::string base = socketBase();

    for (int i = 0; i < 10; i++) {
        const std::string path = base + "/discord-ipc-" + std::to_string(i);
        const auto address = socketAddress(path);
        if (!address || socketInUse(*address)) continue;

        int fd = createSocket(*address);
        if (fd < 0) continue;

        listenFd = fd;
        socketPath = path;
        running = true;
        acceptThread = std::thread(&DiscordIpc::acceptLoop, this);
        logMessage("[ipc] Listening on %s", path.c_str());
        return true;
    }
#endif

    logMessage("[ipc] No available socket");
    return false;
}

void DiscordIpc::stop() {
    if (!running.exchange(false)) return;

#ifdef _WIN32
    if (acceptThread.joinable()) acceptThread.join();
#else
    if (listenFd >= 0) {
        shutdown(listenFd, SHUT_RDWR);
        ::close(listenFd);
        listenFd = -1;
    }

    if (acceptThread.joinable()) acceptThread.join();
    if (!socketPath.empty()) unlink(socketPath.c_str());
#endif

    closeAll(CLOSE_NORMAL, "Server stopped");

    std::vector<std::jthread> connectionThreads;
    {
        std::lock_guard lock(threadsMutex);
        connectionThreads.swap(threads);
    }
    // The jthread destructors join the connection threads when this function returns.
}

void DiscordIpc::acceptLoop() {
#ifdef _WIN32
    for (HANDLE pipe = listener; pipe != INVALID_HANDLE_VALUE; pipe = createPipe(pipeName, false)) {
        if (connectPipe(pipe, running) && running) spawnConnection(pipe);
        else CloseHandle(pipe);

        if (!running) break;
    }
#else
    while (running) {
        int fd = accept(listenFd, nullptr, nullptr);
        if (fd >= 0) spawnConnection(fd);
        else if (!running || errno != EINTR) break;
    }
#endif
}

void DiscordIpc::spawnConnection(IpcHandle handle) {
    auto connection = std::make_shared<Connection>();
    connection->id = nextId++;
    connection->handle = handle;

    std::lock_guard lock(threadsMutex);
    threads.emplace_back(&DiscordIpc::handleConnection, this, connection);
}

void DiscordIpc::handleConnection(ConnectionPtr connection) {
    int32_t opcode = 0;
    std::string payload;

    if (!readFrame(connection->handle, opcode, payload) || opcode != OP_HANDSHAKE) {
        connection->close();
        return;
    }

    const JsonDoc doc = parseJson(payload);
    if (!doc) {
        sendClose(*connection, CLOSE_UNSUPPORTED, "Expected a handshake");
        return;
    }

    yyjson_val* root = yyjson_doc_get_root(doc.get());
    const int version = (int)jsonInt(root, "v", 0);
    const std::string clientId(jsonString(root, "client_id"));

    if (version != 1) {
        sendClose(*connection, CLOSE_INVALID_VERSION, "Invalid Version");
        return;
    }

    bool accepted;
    {
        std::lock_guard lock(connectionsMutex);
        accepted = connections.size() < MAX_CONNECTIONS;
        if (accepted) connections[connection->id] = connection;
    }

    if (!accepted) {
        sendClose(*connection, CLOSE_ABNORMAL, "Server at capacity");
        return;
    }

    logMessage("[ipc] Connected id=%llu", (unsigned long long)connection->id);

    callbacks.onIpcConnect(connection->id, clientId, version);

    while (running && readFrame(connection->handle, opcode, payload)) {
        if (opcode == OP_FRAME) callbacks.onIpcRequest(connection->id, payload);
        else if (opcode == OP_PING) sendFrame(*connection, OP_PONG, payload);
        else break;
    }

    bool removed;
    {
        std::lock_guard lock(connectionsMutex);
        removed = connections.erase(connection->id) > 0;
    }

    if (removed) callbacks.onIpcDisconnect(connection->id);
    connection->close();
}

bool DiscordIpc::sendFrame(Connection& connection, int32_t opcode, const std::string& payload) {
    std::lock_guard lock(connection.writeMutex);
    return writeFrame(connection.handle, opcode, payload);
}

bool DiscordIpc::sendClose(Connection& connection, int code, const std::string& message) {
    JsonWriter json;
    json.number("code", code);
    if (!message.empty()) json.string("message", message);

    const bool sent = sendFrame(connection, OP_CLOSE, json.finish());
    connection.close();
    return sent;
}

void DiscordIpc::send(uint64_t id, const std::string& json) {
    ConnectionPtr connection;
    {
        std::lock_guard lock(connectionsMutex);
        auto it = connections.find(id);
        if (it == connections.end()) {
            logMessage("[ipc] No connection %llu", (unsigned long long)id);
            return;
        }
        connection = it->second;
    }

    if (!sendFrame(*connection, OP_FRAME, json)) {
        logMessage("[ipc] Failed to write to connection %llu", (unsigned long long)id);
    }
}

void DiscordIpc::close(uint64_t id, int code, const std::string& message) {
    ConnectionPtr connection;
    {
        std::lock_guard lock(connectionsMutex);
        auto it = connections.find(id);
        if (it == connections.end()) return;

        connection = std::move(it->second);
        connections.erase(it);
    }

    sendClose(*connection, code, message);
}

void DiscordIpc::closeAll(int code, const std::string& message) {
    decltype(connections) closing;
    {
        std::lock_guard lock(connectionsMutex);
        closing.swap(connections);
    }

    for (auto& [id, connection] : closing) sendClose(*connection, code, message);
}
