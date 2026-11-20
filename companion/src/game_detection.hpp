#pragma once

#include <functional>
#include <memory>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>

#include "matcher.h"
#include "protocol.hpp"

class GameDetection {
public:
    using Callback = std::function<void(const DetectedGame& game, bool running)>;

    explicit GameDetection(Callback callback);

    bool setDatabase(std::string_view json);
    bool start();
    void stop();

private:
    void scan(const Database& db);

    Callback callback;
    std::unique_ptr<Database> database;
    std::unordered_map<std::string, DetectedGame> games;

    // Keep this member last. The destructor then stops the thread before the members it uses.
    std::jthread thread;
};
