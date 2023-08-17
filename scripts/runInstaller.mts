/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./checkNodeVersion.js";

import { execFileSync, execSync } from "child_process";
import { createWriteStream } from "fs";
import { access, constants as fsConstants, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import type * as streamWeb from "stream/web";
import { fileURLToPath } from "url";

const BASE_URL = "https://github.com/Vencord/Installer/releases/latest/download/";
const INSTALLER_PATH_DARWIN = "VencordInstaller.app/Contents/MacOS/VencordInstaller";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_DIR = join(BASE_DIR, "dist", "Installer");
const ETAG_FILE = join(FILE_DIR, "etag.txt");

function getFilename() {
    switch (process.platform) {
        case "win32":
            return "VencordInstaller.exe";
        case "darwin":
            return "VencordInstaller.MacOS.zip";
        case "linux":
            return "VencordInstaller-" + (process.env.WAYLAND_DISPLAY ? "wayland" : "x11");
        default:
            throw new Error("Unsupported platform: " + process.platform);
    }
}

async function ensureBinary() {
    const filename = getFilename();
    console.log("Downloading " + filename);

    await mkdir(FILE_DIR, { recursive: true });

    const downloadName = join(FILE_DIR, filename);
    const outputFile = process.platform === "darwin"
        ? join(FILE_DIR, "VencordInstaller")
        : downloadName;

    const etag = await (async () => {
        try {
            await access(outputFile, fsConstants.F_OK);
        } catch (e) {
            const { code, path }: Partial<{ code: string; path: string; }> = e;
            if (e instanceof Error && code === "ENOENT" && path !== undefined) {
                console.log("Installer not found at: %s", path);
                return null;
            }
            throw e;
        }
        try {
            return await readFile(ETAG_FILE, "utf-8");
        } catch (e) {
            const { code, path }: Partial<{ code: string; path: string; }> = e;
            if (e instanceof Error && code === "ENOENT" && path !== undefined) {
                console.log("Installer ETag not found at: %s", path);
                return null;
            }
            throw e;
        }
    })();

    const headers: HeadersInit = {
        "User-Agent": "Vencord (https://github.com/Vendicated/Vencord)",
    };
    if (etag !== null) {
        headers["If-None-Match"] = etag;
    }
    const res = await fetch(BASE_URL + filename, { headers });

    if (res.status === 304) {
        console.log("Up to date, not redownloading!");
        return outputFile;
    }
    if (!res.ok)
        throw new Error(`Failed to download installer: ${res.status} ${res.statusText}`);

    const resEtag = res.headers.get("etag");
    if (resEtag === null)
        throw new Error(`Unknown ETag for installer: ${res.status} ${res.statusText}`);
    await writeFile(ETAG_FILE, resEtag);

    if (process.platform === "darwin") {
        console.log("Unzipping...");
        const zip = new Uint8Array(await res.arrayBuffer());

        const ff = await import("fflate");
        const bytes = ff.unzipSync(zip, {
            filter: f => f.name === INSTALLER_PATH_DARWIN
        })[INSTALLER_PATH_DARWIN];

        await writeFile(outputFile, bytes, { mode: 0o755 });

        console.log("Overriding security policy for installer binary (this is required to run it)");
        console.log("xattr might error, that's okay");

        const logAndRun = cmd => {
            console.log("Running", cmd);
            try {
                execSync(cmd);
            } catch { }
        };
        logAndRun(`sudo spctl --add '${outputFile}' --label "Vencord Installer"`);
        logAndRun(`sudo xattr -d com.apple.quarantine '${outputFile}'`);
    } else {
        // Type cast because `ReadableStream` is a different type.
        const bodyWebStream = res.body as streamWeb.ReadableStream<Uint8Array> | null;
        if (bodyWebStream === null) {
            throw new Error(`Failed to read installer body: ${res.status} ${res.statusText}`);
        }
        // WHY DOES NODE FETCH RETURN A WEB STREAM OH MY GOD
        const body = Readable.fromWeb(bodyWebStream);
        await finished(body.pipe(createWriteStream(outputFile, {
            mode: 0o755,
            autoClose: true
        })));
    }

    console.log("Finished downloading!");

    return outputFile;
}



const installerBin = await ensureBinary();

console.log("Now running Installer...");

execFileSync(installerBin, {
    stdio: "inherit",
    encoding: "buffer",
    env: {
        ...process.env,
        VENCORD_USER_DATA_DIR: BASE_DIR,
        VENCORD_DEV_INSTALL: "1"
    }
});
