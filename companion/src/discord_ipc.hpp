#pragma once

#include <atomic>
#include <cstdint>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

#ifdef _WIN32
#include <windows.h>
using IpcHandle = HANDLE;
#else
using IpcHandle = int;
#endif

struct IpcCallbacks {
    virtual ~IpcCallbacks() = default;
    virtual void onIpcConnect(uint64_t id, const std::string& clientId, int version) = 0;
    virtual void onIpcRequest(uint64_t id, const std::string& payload) = 0;
    virtual void onIpcDisconnect(uint64_t id) = 0;
};

class DiscordIpc {
public:
    explicit DiscordIpc(IpcCallbacks& callbacks);
    ~DiscordIpc();

    bool start();
    void stop();

    void send(uint64_t id, const std::string& json);
    void close(uint64_t id, int code, const std::string& message);
    void closeAll(int code, const std::string& message);

private:
    struct Connection;
    using ConnectionPtr = std::shared_ptr<Connection>;

    bool sendFrame(Connection& connection, int32_t opcode, const std::string& payload);
    bool sendClose(Connection& connection, int code, const std::string& message);
    void acceptLoop();
    void spawnConnection(IpcHandle handle);
    void handleConnection(ConnectionPtr connection);

    IpcCallbacks& callbacks;

    std::mutex connectionsMutex;
    std::unordered_map<uint64_t, ConnectionPtr> connections;
    std::atomic<uint64_t> nextId{ 0 };

    std::mutex threadsMutex;
    std::vector<std::jthread> threads;

    std::thread acceptThread;
    std::atomic<bool> running{ false };

#ifdef _WIN32
    std::wstring pipeName;
    HANDLE listener = INVALID_HANDLE_VALUE;
#else
    int listenFd = -1;
    std::string socketPath;
#endif
};
