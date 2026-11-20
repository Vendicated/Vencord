#include "platform.hpp"

#include <cstdlib>
#include <system_error>
#include <vector>

#ifdef __APPLE__
#include <mach-o/dyld.h>
#else
#include <fcntl.h>
#include <sys/sendfile.h>
#include <unistd.h>
#endif

#include "log.hpp"
#include "protocol.hpp"

namespace fs = std::filesystem;

namespace {

constexpr const char* BINARY_NAME = "vencord-rpc-" VENCORD_RPC_VERSION;
constexpr const char* MANIFEST_NAME = "dev.vencord.rpc.json";

#ifdef __APPLE__
constexpr const char* BROWSER_ROOTS[] = {
    "Library/Application Support/BraveSoftware/Brave-Browser",
    "Library/Application Support/Google/Chrome",
    "Library/Application Support/Chromium",
    "Library/Application Support/Microsoft Edge"
};
#else
constexpr const char* BROWSER_ROOTS[] = {
    ".config/BraveSoftware/Brave-Browser",
    ".config/google-chrome",
    ".config/chromium",
    ".config/microsoft-edge"
};
#endif

fs::path homeDir() {
    const char* home = getenv("HOME");
    return home ? home : "/tmp";
}

std::vector<fs::path> manifestDirs() {
    std::vector<fs::path> dirs;
    std::error_code error;

    for (const char* root : BROWSER_ROOTS) {
        const fs::path browser = homeDir() / root;
        if (fs::exists(browser, error)) dirs.push_back(browser / "NativeMessagingHosts");
    }

    return dirs;
}

bool copyFile(const fs::path& source, const fs::path& target) {
#ifdef __APPLE__
    std::error_code error;
    return fs::copy_file(source, target, fs::copy_options::overwrite_existing, error);
#else
    // libstdc++ copy_file can fall back to fstream, which adds about 450 KB to the static binary, sasuga C devs
    const int input = open(source.c_str(), O_RDONLY | O_CLOEXEC);
    const int output = open(target.c_str(), O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC, 0755);

    bool copied = input >= 0 && output >= 0;
    while (copied) {
        const ssize_t sent = sendfile(output, input, nullptr, 1 << 30);
        if (sent == 0) break;
        copied = sent > 0;
    }

    if (input >= 0) close(input);
    if (output >= 0) close(output);
    return copied;
#endif
}

}  // namespace

fs::path executablePath() {
    std::error_code error;

#ifdef __APPLE__
    uint32_t size = 0;
    _NSGetExecutablePath(nullptr, &size);
    std::string buffer(size, '\0');
    if (_NSGetExecutablePath(buffer.data(), &size) != 0) return {};

    return fs::canonical(buffer.c_str(), error);
#else
    return fs::read_symlink("/proc/self/exe", error);
#endif
}

fs::path installDir() {
#ifdef __APPLE__
    return homeDir() / "Library/Application Support/Vencord RPC";
#else
    const char* data = getenv("XDG_DATA_HOME");
    return (data ? fs::path(data) : homeDir() / ".local/share") / "vencord-rpc";
#endif
}

void install() {
    std::error_code error;
    const fs::path dir = installDir();
    fs::create_directories(dir, error);
    setLogFile(dir / "install.log");

    const fs::path source = executablePath();
    const fs::path target = dir / BINARY_NAME;

    if (source != target) {
        if (!copyFile(source, target)) {
            logMessage("Failed to copy the companion to %s", target.c_str());
            return;
        }

        fs::permissions(target, fs::perms::owner_all | fs::perms::group_read | fs::perms::group_exec | fs::perms::others_read | fs::perms::others_exec, error);
    }

    const std::string manifest = manifestJson(target);

    for (const fs::path& manifestDir : manifestDirs()) {
        fs::create_directories(manifestDir, error);
        writeFile(manifestDir / MANIFEST_NAME, manifest);
    }

    logMessage("Installed %s", target.c_str());
    if (source != target) fs::remove(source, error);
}

void uninstall() {
    std::error_code error;
    const fs::path dir = installDir();
    setLogFile(dir / "install.log");

    for (const fs::path& manifestDir : manifestDirs()) fs::remove(manifestDir / MANIFEST_NAME, error);

    fs::remove(dir / BINARY_NAME, error);
    fs::remove(executablePath(), error);

    logMessage("Uninstalled the WebRPC companion");
}
