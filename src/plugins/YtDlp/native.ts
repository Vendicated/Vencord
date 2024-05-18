/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync, spawn } from "child_process";
import { IpcMainInvokeEvent } from "electron";
import * as fs from "fs";
import os from "os";
import path from "path";

type DownloadOptions = {
    format?: "video" | "audio" | "gif";
    additional_arguments?: string[];
    max_file_size?: number;
};

const WIN = "https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp.exe";
const LINUX = "https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp_linux";
const LINUX_AARCH64 = "https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp_linux_aarch64";
const LINUX_ARMV7L = "https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp_linux_armv7l";
const MACOS = "https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp_macos";

let ytdlpBin: ArrayBuffer | null = null;
let workdir: string | null = null;

let stdout_global: string = "";

const setYtDlp = (ytDlp: ArrayBuffer) => (ytdlpBin = ytDlp);
const getdir = () => workdir ?? process.cwd();
const p = (file: string) => path.join(getdir(), file);
const cleanVideoFiles = () => {
    if (!workdir) return;
    fs.readdirSync(workdir)
        .filter(f => f.startsWith("download."))
        .forEach(f => fs.unlinkSync(p(f)));
};
function ytdlp(args: string[]): Promise<string> {
    stdout_global = "";

    return new Promise<string>((resolve, reject) => {
        const yt = spawn(p("yt-dlp.exe"), args, {
            cwd: workdir ?? process.cwd(),
        });

        yt.stdout.on("data", data => {
            stdout_global += data;
        });
        yt.stderr.on("data", data => {
            console.error(`stderr: ${data}`);
        });
        yt.on("exit", code => {
            resolve(stdout_global);
        });
    });
}

function argsFromFormat(format?: "video" | "audio" | "gif", max_file_size?: number) {
    const HAS_LIMIT = !!max_file_size;
    const MAX_VIDEO_SIZE = HAS_LIMIT ? max_file_size * 0.8 : 0;
    const MAX_AUDIO_SIZE = HAS_LIMIT ? max_file_size * 0.2 : 0;

    switch (format) {
        case "audio": {
            const FORMAT_STRING = "ba*{TOT_SIZE}/wa/w"
                .replace("{TOT_SIZE}", HAS_LIMIT ? `[filesize<${max_file_size}]` : "");
            return ["-f", FORMAT_STRING, "-x", "--audio-format", "mp3"];
        }
        // fuck this shit
        // case "gif": {
        //     const FORMAT_STRING = "bv{TOT_SIZE}/wv";
        //     return ["-f", FORMAT_STRING, "--remux-video", "gif"];
        // }
        case "video":
        default: {
            const FORMAT_STRING = "b*[ext=webm]{VID_SIZE}+ba{AUD_SIZE}/b*[ext=mp4]{VID_SIZE}+ba{AUD_SIZE}/b*{VID_SIZE}+ba{AUD_SIZE}/b{TOT_SIZE}/w"
                .replace("{VID_SIZE}", HAS_LIMIT ? `[filesize<${MAX_VIDEO_SIZE}]` : "")
                .replace("{AUD_SIZE}", HAS_LIMIT ? `[filesize<${MAX_AUDIO_SIZE}]` : "")
                .replace("{TOT_SIZE}", HAS_LIMIT ? `[filesize<${max_file_size}]` : "");
            const REMUX_STRING = "webm>webm/mp4";
            return ["-f", FORMAT_STRING, "--remux-video", REMUX_STRING];
        }
    }
}

async function setup(buffer: ArrayBuffer) {
    setYtDlp(buffer);

    workdir = fs.mkdtempSync(path.join(os.tmpdir(), "vencord_ytdlp_"));
    console.log("[Plugin:yt-dlp] Using workdir: ", workdir);

    // okay so windows is the only system that throws a fit if you don't include the .exe, so I'm just adding it for all of them.
    fs.writeFileSync(p("yt-dlp.exe"), Buffer.from(buffer));
}

async function _download(url: string, { format, additional_arguments, max_file_size }: DownloadOptions): Promise<{
    buffer: Buffer;
    title: string;
} | {
    error: string;
}> {
    // Due to a limitation in yt-dlp, we have to manually determine the size of video and audio
    const HAS_LIMIT = !!max_file_size;
    const MAX_VIDEO_SIZE = HAS_LIMIT ? max_file_size * 0.8 : 0;
    const MAX_AUDIO_SIZE = HAS_LIMIT ? max_file_size * 0.2 : 0;
    const FORMAT_STRING = "b*[ext=webm]{VID_SIZE}+ba{AUD_SIZE}/b*[ext=mp4]{VID_SIZE}+ba{AUD_SIZE}/b*{VID_SIZE}+ba{AUD_SIZE}/b{TOT_SIZE}/w"
        .replace("{VID_SIZE}", HAS_LIMIT ? `<${MAX_VIDEO_SIZE}` : "")
        .replace("{AUD_SIZE}", HAS_LIMIT ? `<${MAX_AUDIO_SIZE}` : "")
        .replace("{TOT_SIZE}", HAS_LIMIT ? `<${max_file_size}` : "");
    const REMUX_STRING = "webm>webm/mp4";

    const exts = ["webm", "mp4", "mp3", "gif"]; // maybe support stuff like gifs and audio-only later
    let title = "video";

    const baseArgs = [...argsFromFormat(format), "-o", "download.%(ext)s", "--force-overwrites", "-I", "1"];

    cleanVideoFiles();

    // === Get metadata ===
    try {
        const metadata = JSON.parse(await ytdlp(["-J", url, "--no-warnings"]));
        if (metadata.is_live) return { error: "Live streams are not supported." };
        if (metadata.title) title = `${metadata.title}`;
    } catch (e: any) {
        console.error(e);
        return {
            error: "Failed to get video metadata:\n" + e?.stderr?.toString()
                ? `\`\`\`\n${e?.stderr?.toString()}\n\`\`\``
                : "An unknown error occurred."
        };
    }

    // === Download video ===
    try {
        const customArgs = additional_arguments?.filter(Boolean) || [];

        // yt-dlp prioritizes the last occurrence of an argument
        await ytdlp([...baseArgs, ...customArgs, url]);
        // get the first file that matches the extensions
        const filename = "download." + exts.find(ext => fs.existsSync(p(`download.${ext}`)));
        if (!filename) throw new Error("Video downloaded, but no file was found!");
        const ext = filename.split(".")[1];
        const buffer = fs.readFileSync(p(filename));

        return {
            buffer,
            title: `${title}.${ext}`
        };
    } catch (e: any) {
        console.error(e);
        return {
            error: "Failed to download or remux video:\n" + (e?.stderr?.toString()
                ? `\`\`\`\n${e?.stderr?.toString()}\n\`\`\``
                : `\`\`\`\n${e?.toString()}\n\`\`\``)
        };
    }
}

export async function start(_: IpcMainInvokeEvent, ytDlp: ArrayBuffer | null) {
    try {
        if (ytDlp) {
            await setup(ytDlp);
            return "reused";
        }

        const platform = os.platform();
        let url: string;
        switch (platform) {
            case "win32":
                url = WIN;
                break;
            case "linux":
                url = os.arch() === "arm" ? LINUX_ARMV7L : os.arch() === "arm64" ? LINUX_AARCH64 : LINUX;
                break;
            case "darwin":
                url = MACOS;
                break;
            default:
                throw new Error("Unsupported platform.");
        }

        const blob = await (await fetch(WIN)).blob();
        const buffer = await blob.arrayBuffer();

        setup(buffer);
        return buffer;
    } catch (e) {
        console.error(e);
        return "error";
    }
}
export async function stop(_: IpcMainInvokeEvent) {
    if (workdir) {
        fs.rmSync(workdir, { recursive: true });
        workdir = null;
    }
}

export async function download(
    _: IpcMainInvokeEvent,
    url: string,
    options: DownloadOptions
): Promise<{
    buffer: Buffer;
    title: string;
} | {
    error: string;
}> {
    return await _download(url, options);
}

export function getStdout() {
    return stdout_global;
}

export function checkffmpeg(_?: IpcMainInvokeEvent) {
    try {
        execFileSync("ffmpeg", ["-version"]);
        return true;
    } catch (e) {
        return false;
    }
}
