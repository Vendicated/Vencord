# Vencord WebRPC companion

Small native messaging host for the Vencord WebRPC browser extension. It provides Discord RPC over IPC and reports detected games.

## Size

The Windows x64 build is about 350 KiB. The static Linux x64 build is about 330 KiB. They use:

* Static MSVC runtime.
* LTO and size optimisation.
* `yyjson` with the writer, utilities, file APIs, and incremental reader disabled.

## Game detection

The host compiles the GameDetection core from the `vendor/game-detection` submodule:

* `src/matcher.cc`
* `src/process_win.cc` on Windows
* `src/process_linux.cc` on Linux
* `src/process_mac.cc` on macOS

`src/addon.cc` is not compiled because it is N-API glue.

The database is pushed by the extension and parsed with `yyjson` from the `vendor/yyjson` submodule. The submodule is pinned to `0.13.0`.

## Build

Requirements:

* CMake 3.24 or newer.
* A C++20 compiler.
* Git, for the submodules.

Initialize the submodules:

```sh
git submodule update --init --recursive
```

### Windows

```powershell
cmake -S . -B build -A x64 -DCMAKE_BUILD_TYPE=MinSizeRel
cmake --build build --config MinSizeRel
```

The binary is `build/MinSizeRel/vencord-rpc.exe`.

### Linux

```sh
./scripts/build-linux.sh linux/amd64
```

This builds a static musl binary in Docker and writes `dist/vencord-rpc`.

Use `linux/arm64` for ARM64.

### macOS

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=MinSizeRel
cmake --build build --config MinSizeRel
```

### Tests

```sh
ctest --test-dir build -C MinSizeRel --output-on-failure
```

## Install

Run the binary without arguments.

* Windows: copies to `%LOCALAPPDATA%\Vencord\RPC`, writes the manifest, and registers the Chromium browser registry keys.
* Linux: copies to `${XDG_DATA_HOME:-~/.local/share}/vencord-rpc` and writes Chrome/Chromium manifests.
* macOS: copies to `~/Library/Application Support/Vencord RPC` and writes Chrome/Chromium manifests.

Installation is silent. The binary never opens a window.

On Linux and macOS the downloaded binary is removed after it is copied. On Windows the downloaded file remains.

## Uninstall

```sh
vencord-rpc --uninstall
```

## Logs

* `host.log` in the install directory when installed.
* `host.log` in the temporary data directory when run from a build directory.
* `install.log` in the install directory.

## Memory

The extension sends a 13 MiB detectable-games database. The host frees that message and the parsed JSON after building the database.

The database is filtered per platform before it is stored:

- Windows keeps only games with a Windows executable. Steam app IDs are not stored because Windows detection uses executable paths.
- Linux keeps Windows and Linux executables plus Steam app IDs, for Wine and Steam.
- macOS keeps only macOS executables. Steam app IDs are not stored because macOS detection uses process paths.

Steady private memory is about 6 MiB on Windows. The rest of the working set is shared code and libraries.

## Protocol

See [PROTOCOL.md](./PROTOCOL.md).

## GitHub

`.github/workflows/build.yml` uploads build artifacts. `.github/workflows/release.yml` publishes binaries to a GitHub Release on `v*` tags.

These workflows run when this directory is its own repository. While it lives inside Vencord, use the local build commands above.

## License

GPL-3.0-or-later. The GameDetection submodule is also GPL-3.0-or-later.
