#include "platform.hpp"

#include <windows.h>

#include <iterator>
#include <string>
#include <system_error>

#include "log.hpp"
#include "protocol.hpp"

namespace fs = std::filesystem;

namespace {

constexpr const wchar_t* BINARY_NAME = L"vencord-rpc-" VENCORD_RPC_VERSION ".exe";
constexpr const wchar_t* MANIFEST_NAME = L"native-messaging.json";

constexpr const wchar_t* BROWSER_KEYS[] = {
    L"BraveSoftware\\Brave-Browser",
    L"Google\\Chrome",
    L"Chromium",
    L"Microsoft\\Edge"
};

fs::path environment(const wchar_t* name) {
    wchar_t buffer[32768];
    const DWORD size = GetEnvironmentVariableW(name, buffer, (DWORD)std::size(buffer));
    return std::wstring(buffer, size);
}

// Set the manifest path for each browser, or remove the registry keys if manifest is null.
void updateRegistry(const fs::path* manifest) {
    for (const wchar_t* browser : BROWSER_KEYS) {
        const std::wstring key = std::wstring(L"Software\\") + browser + L"\\NativeMessagingHosts\\" VENCORD_RPC_HOST_NAME;

        if (!manifest) {
            RegDeleteKeyW(HKEY_CURRENT_USER, key.c_str());
            continue;
        }

        const std::wstring& value = manifest->native();
        RegSetKeyValueW(HKEY_CURRENT_USER, key.c_str(), nullptr, REG_SZ, value.c_str(), (DWORD)((value.size() + 1) * sizeof(wchar_t)));
    }
}

void removeOldBinaries(const fs::path& dir, const fs::path& keep) {
    std::error_code error;

    for (const fs::directory_entry& entry : fs::directory_iterator(dir, error)) {
        const std::wstring name = entry.path().filename();
        const bool old = name.starts_with(L"vencord-rpc-") || name.starts_with(L"rpc_native-");
        if (old && entry.path() != keep) fs::remove(entry.path(), error);
    }
}

}  // namespace

fs::path executablePath() {
    std::wstring buffer(32768, L'\0');
    buffer.resize(GetModuleFileNameW(nullptr, buffer.data(), (DWORD)buffer.size()));
    return buffer;
}

fs::path installDir() {
    fs::path base = environment(L"LOCALAPPDATA");
    if (base.empty()) base = environment(L"USERPROFILE") / L"AppData\\Local";

    return base / L"Vencord\\RPC";
}

void install() {
    std::error_code error;
    const fs::path dir = installDir();
    fs::create_directories(dir, error);
    setLogFile(dir / "install.log");

    const fs::path source = executablePath();
    const fs::path target = dir / BINARY_NAME;

    if (source != target && !fs::copy_file(source, target, fs::copy_options::overwrite_existing, error)) {
        logMessage("Failed to copy the companion to %s: %s", pathToUtf8(target).c_str(), error.message().c_str());
        return;
    }

    const fs::path manifestPath = dir / MANIFEST_NAME;
    writeFile(manifestPath, manifestJson(target));
    updateRegistry(&manifestPath);
    removeOldBinaries(dir, target);

    logMessage("Installed %s", pathToUtf8(target).c_str());
    logMessage("Manifest %s", pathToUtf8(manifestPath).c_str());
}

void uninstall() {
    std::error_code error;
    const fs::path dir = installDir();
    setLogFile(dir / "install.log");

    updateRegistry(nullptr);
    fs::remove(dir / MANIFEST_NAME, error);

    const fs::path source = executablePath();
    removeOldBinaries(dir, source);

    if (source == dir / BINARY_NAME) {
        // Windows cannot delete a running executable, but it can rename it.
        fs::rename(source, fs::path(source) += L".old", error);
        if (error) logMessage("Remove %s manually", pathToUtf8(source).c_str());
    } else {
        fs::remove(source, error);
    }

    logMessage("Uninstalled the WebRPC companion");
}
