#include "platform.hpp"

#include <cstdio>
#include <system_error>

#include "json.hpp"
#include "protocol.hpp"

#ifdef _WIN32
#include <share.h>
#endif

namespace fs = std::filesystem;

std::string pathToUtf8(const fs::path& path) {
    const std::u8string text = path.u8string();
    return { text.begin(), text.end() };
}

std::string manifestJson(const fs::path& binary) {
    return
        "{\n"
        "  \"name\": \"" VENCORD_RPC_HOST_NAME "\",\n"
        "  \"description\": \"Vencord WebRPC companion\",\n"
        "  \"path\": \"" + jsonEscape(pathToUtf8(binary)) + "\",\n"
        "  \"type\": \"stdio\",\n"
        "  \"allowed_origins\": [\n"
        "    \"chrome-extension://cbghhgpcnddeihccjmnadmkaejncjndb/\",\n"
        "    \"chrome-extension://kdjgghpjlgcndkmecagdeomdmlfaloaf/\"\n"
        "  ]\n"
        "}\n";
}

void writeFile(const fs::path& path, std::string_view data, bool append) {
    // Use C files instead of fstream, because fstream makes the static binary much larger.
#ifdef _WIN32
    FILE* file = _wfsopen(path.c_str(), append ? L"ab" : L"wb", _SH_DENYNO);
#else
    FILE* file = fopen(path.c_str(), append ? "ab" : "wb");
#endif
    if (!file) return;

    fwrite(data.data(), 1, data.size(), file);
    fclose(file);
}

fs::path dataDir() {
    std::error_code error;
    const fs::path dir = installDir();
    if (fs::equivalent(executablePath().parent_path(), dir, error)) return dir;

    const fs::path temp = fs::temp_directory_path(error) / "vencord-rpc";
    fs::create_directories(temp, error);
    return temp;
}
