#pragma once

#include <string>
#include <string_view>

#include "discord_ipc.hpp"
#include "game_detection.hpp"
#include "native_messaging.hpp"

class Host : public IpcCallbacks {
public:
    Host();
    int run();

    void onIpcConnect(uint64_t id, const std::string& clientId, int version) override;
    void onIpcRequest(uint64_t id, const std::string& payload) override;
    void onIpcDisconnect(uint64_t id) override;

private:
    void handleMessage(std::string_view message);
    void onReady(bool gameDetection);
    void setGameDetection(bool enabled);
    void onGame(const DetectedGame& game, bool running);
    void send(const std::string& json);
    void sendType(const char* type);

    NativeMessaging native;
    DiscordIpc ipc;
    GameDetection detection;

    bool rendererReady = false;
    bool wantGameDetection = true;
    bool ipcStarted = false;
};
