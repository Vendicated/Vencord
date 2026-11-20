#pragma once

#include <mutex>
#include <string>

class NativeMessaging {
public:
    bool read(std::string& message);
    void write(const std::string& json);

private:
    std::mutex writeMutex;
    bool closed = false;
};
