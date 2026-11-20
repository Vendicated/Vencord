#pragma once

#include <cstdint>
#include <string>

#define VENCORD_RPC_HOST_NAME "dev.vencord.rpc"

#ifndef VENCORD_RPC_VERSION
#define VENCORD_RPC_VERSION "0.2.0"
#endif

constexpr int PROTOCOL_VERSION = 1;

enum Opcode : int32_t {
    OP_HANDSHAKE = 0,
    OP_FRAME = 1,
    OP_CLOSE = 2,
    OP_PING = 3,
    OP_PONG = 4
};

enum CloseCode : int {
    CLOSE_NORMAL = 1000,
    CLOSE_UNSUPPORTED = 1003,
    CLOSE_ABNORMAL = 1006,
    CLOSE_INVALID_VERSION = 4004
};

constexpr size_t MAX_FRAME = 3 * 1024 * 1024;
constexpr size_t MAX_NATIVE_MESSAGE = 64 * 1024 * 1024;
constexpr size_t MAX_CONNECTIONS = 100;

struct DetectedGame {
    std::string id;
    std::string name;
    uint32_t pid = 0;
    std::string path;
};
