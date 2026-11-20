#include "host.hpp"

#include <algorithm>
#include <cstdlib>
#include <string>
#include <vector>

#include "platform.hpp"

#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#endif

namespace {

bool isNativeLaunch(const std::vector<std::string>& args) {
    return std::ranges::any_of(args, [](const std::string& arg) {
        return arg.starts_with("chrome-extension://") || arg.starts_with("moz-extension://") || arg.starts_with("--parent-window=");
    });
}

int run(const std::vector<std::string>& args) {
    if (std::ranges::find(args, "--uninstall") != args.end()) {
        uninstall();
        return 0;
    }

    if (isNativeLaunch(args)) {
        Host host;
        return host.run();
    }

    install();
    return 0;
}

}  // namespace

#ifdef __GLIBCXX__
// The default libstdc++ handler prints a demangled type name, which links the C++ demangler
namespace __gnu_cxx {
void __verbose_terminate_handler() {
    std::abort();
}
}  // namespace __gnu_cxx
#endif

#ifdef _WIN32

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    int count = 0;
    wchar_t** argv = CommandLineToArgvW(GetCommandLineW(), &count);
    if (!argv) return 1;

    std::vector<std::string> args;
    for (int i = 1; i < count; i++) args.push_back(pathToUtf8(argv[i]));

    LocalFree(argv);
    return run(args);
}

#else

int main(int argc, char** argv) {
    return run({ argv + 1, argv + argc });
}

#endif
