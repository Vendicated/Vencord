/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fs from "fs";
import os from "os";
import path from "path";

import { binBase64 as binBase64DarwinArm64 } from "./addons/active-window-v2.1.2-napi-v6-darwin-arm64";
import { binBase64 as binBase64DarwinX64 } from "./addons/active-window-v2.1.2-napi-v6-darwin-x64";
import { binBase64 as binBase64LinuxX64 } from "./addons/active-window-v2.1.2-napi-v6-linux-x64";
import { binBase64 as binBase64Win32X64 } from "./addons/active-window-v2.1.2-napi-v6-win32-x64";
import { Module, NativeWindowInfo } from "./types";

const SUPPORTED_PLATFORMS = ["win32", "linux", "darwin"];

function getBinBase64ForCurrentSystem(): string | undefined {
    switch (process.platform) {
        case "win32":
            return binBase64Win32X64;
        case "linux":
            return binBase64LinuxX64;
        case "darwin":
            switch (process.arch) {
                case "x64":
                    return binBase64DarwinX64;
                case "arm64":
                    return binBase64DarwinArm64;
                default:
                    return undefined;
            }
        default:
            return undefined;
    }
}

export function loadAddon(): Module<NativeWindowInfo> {
    const binBase64: string | undefined = getBinBase64ForCurrentSystem();
    if (binBase64 === undefined) {
        const supportedPlatformsStr = SUPPORTED_PLATFORMS.join(",");
        throw new Error(
            `Unsupported platform. The supported platforms are: ${supportedPlatformsStr}`
        );
    }

    const addonFileName = `addon-${process.pid}.node`;
    const addonFilePath = path.join(os.tmpdir(), addonFileName);
    try {
        const bin = Buffer.from(binBase64, "base64");
        fs.writeFileSync(addonFilePath, bin);
        return require(addonFilePath);
    } finally {
        process.on("exit", () => {
            try {
                fs.unlinkSync(addonFilePath);
            } catch {
            }
        });
    }
}
