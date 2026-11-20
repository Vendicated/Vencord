#pragma once

#include <filesystem>

void setLogFile(const std::filesystem::path& path);
void logMessage(const char* format, ...);
