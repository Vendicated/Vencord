#pragma once

#include <filesystem>
#include <string>
#include <string_view>

std::filesystem::path executablePath();
std::filesystem::path installDir();
std::filesystem::path dataDir();

std::string pathToUtf8(const std::filesystem::path& path);
std::string manifestJson(const std::filesystem::path& binary);
void writeFile(const std::filesystem::path& path, std::string_view data, bool append = false);

void install();
void uninstall();
