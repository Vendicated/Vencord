/*
 * This file exists purely to avoid reliance on ffmpeg/ffprobe being in the system path
 * not a big fan of path based resolution
 */

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

const cache: Partial<Record<"ffmpeg" | "ffprobe", string>> = {};
function candidatePaths(bin: "ffmpeg" | "ffprobe"): string[] {
    switch (process.platform) {
        case "win32":
            return [
                `C:\\ffmpeg\\bin\\${bin}.exe`,
                `C:\\Program Files\\ffmpeg\\bin\\${bin}.exe`,
                `C:\\Program Files (x86)\\ffmpeg\\bin\\${bin}.exe`,
            ];
        case "darwin":
            return [
                `/opt/homebrew/bin/${bin}`,
                `/usr/local/bin/${bin}`,
                `/usr/bin/${bin}`,
            ];
        default:
            return [
                `/usr/bin/${bin}`,
                `/usr/local/bin/${bin}`,
                `/bin/${bin}`,
                `/snap/bin/${bin}`,
                `/app/bin/${bin}`,
            ];
    }
}

async function validateBinary(binPath: string, binName: string, timeoutMs = 5000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const p = spawn(binPath, ["-version"], { shell: false });

        let out = "";
        let timeExceeded = false;

        const timeout = setTimeout(() => {
            timeExceeded = true;
            p.kill();
            reject(new Error(`${binPath} validation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        p.stdout.on("data", d => (out += d));

        p.on("close", code => {
            clearTimeout(timeout);
            if (timeExceeded) return;

            if (code !== 0 || !out.toLowerCase().includes(binName)) {
                reject(new Error(`${binPath} is not a valid ${binName} binary`));
            } else {
                resolve();
            }
        });

        p.on("error", err => {
            clearTimeout(timeout);
            if (!timeExceeded) reject(err);
        });
    });
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export function pullBinary(bin: "ffmpeg" | "ffprobe") {
    const binPath = cache[bin];
    if (!binPath) throw new Error("requested binary has not been resolved");
    return binPath;
}

export async function resolveBinary(
    userPath: string | undefined,
    bin: "ffmpeg" | "ffprobe",
): Promise<string> {
    if (cache[bin]) return cache[bin];

    const searchedPaths: string[] = [];

    if (userPath) {
        if (!path.isAbsolute(userPath)) {
            throw new Error(`${bin} path must be absolute`);
        }
        if (!(await fileExists(userPath))) {
            throw new Error(`${bin} not found at ${userPath}`);
        }
        await validateBinary(userPath, bin);
        cache[bin] = userPath;
        return userPath;
    }

    for (const p of candidatePaths(bin)) {
        searchedPaths.push(p);

        if (await fileExists(p)) {
            try {
                await validateBinary(p, bin);
                cache[bin] = p;
                return p;
            } catch (err) {
                continue;
            }
        }
    }

    throw new Error(
        `${bin} not found, either needs installation or define a custom path`
    );
}