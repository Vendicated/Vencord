#include "log.hpp"

#include <chrono>
#include <cstdarg>
#include <cstdint>
#include <cstdio>
#include <mutex>
#include <string>

#include "platform.hpp"

namespace {

constexpr std::uintmax_t MAX_LOG_SIZE = 1024 * 1024;

std::mutex logMutex;
std::filesystem::path logPath;
const auto startTime = std::chrono::steady_clock::now();

}  // namespace

void setLogFile(const std::filesystem::path& path) {
    std::lock_guard lock(logMutex);
    logPath = path;

    std::error_code error;
    if (!std::filesystem::exists(path, error) || std::filesystem::file_size(path, error) <= MAX_LOG_SIZE || error) return;

    std::filesystem::path backup = path;
    backup += ".old";

    std::filesystem::remove(backup, error);
    std::filesystem::rename(path, backup, error);
    if (error) std::filesystem::resize_file(path, 0, error);
}

void logMessage(const char* format, ...) {
    char buffer[2048];

    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);

    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - startTime);
    const std::string line = "[" + std::to_string(elapsed.count()) + "] [vencord-rpc] " + buffer + "\n";

    std::lock_guard lock(logMutex);

    fputs(line.c_str(), stderr);
    if (!logPath.empty()) writeFile(logPath, line, true);
}
