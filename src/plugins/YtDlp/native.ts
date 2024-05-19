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

import { Extensions } from "./constants";

type DownloadOptions = {
    format?: "video" | "audio" | "gif";
    additional_arguments?: string[];
    max_file_size?: number;
};

let workdir: string | null = null;
let stdout_global: string = "";

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
        const yt = spawn("yt-dlp", args, {
            cwd: getdir(),
        });

        yt.stdout.on("data", data => {
            stdout_global += data;
            // Makes carriage return (\r) work
            stdout_global = stdout_global.replace(/^.*\r([^\n])/gm, "$1");
        });
        yt.stderr.on("data", data => {
            console.error(`stderr: ${data}`);
        });
        yt.on("exit", code => {
            code === 0 ? resolve(stdout_global) : reject(new Error(`yt-dlp exited with code ${code}`));
        });
    });
}

function argsFromFormat(format?: "video" | "audio" | "gif", max_file_size?: number) {
    // Due to a limitation in yt-dlp, we have to manually determine the size of video and audio
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

export async function start(_: IpcMainInvokeEvent) {
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), "vencord_ytdlp_"));
    console.log("[Plugin:yt-dlp] Using workdir: ", workdir);
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
    { format, additional_arguments, max_file_size }: DownloadOptions
): Promise<{
    buffer: Buffer;
    title: string;
} | {
    error: string;
}> {
    let title = "video";

    const baseArgs = [...argsFromFormat(format, max_file_size), "-o", "download.%(ext)s", "--force-overwrites", "-I", "1"];

    cleanVideoFiles();

    // === Get metadata ===
    try {
        const metadata = JSON.parse(await ytdlp(["-J", url, "--no-warnings"]));
        if (metadata.is_live) return { error: "Live streams are not supported." };
        if (metadata.title) title = `${metadata.title}`;
    } catch (e: any) {
        console.error(e);
        return {
            error:
                "Failed to get video metadata:\n" +
                `\`\`\`\n${e?.stderr?.toString() || e?.toString()}\n\`\`\``
        };
    }

    // === Download video ===
    try {
        const customArgs = additional_arguments?.filter(Boolean) || [];

        // yt-dlp prioritizes the last occurrence of an argument
        await ytdlp([...baseArgs, ...customArgs, url]);
        // get the first file that matches the extensions
        const filename = "download." + Extensions.find(ext => fs.existsSync(p(`download.${ext}`)));
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
            error:
                "Failed to download or remux video:\n" +
                `\`\`\`\n${e?.stderr?.toString() || e?.toString()}\n\`\`\``
        };
    }
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
export async function checkytdlp(_?: IpcMainInvokeEvent) {
    const base = () => execFileSync("yt-dlp", ["--version"]);
    const python = () => execFileSync("python", ["-m", "yt_dlp", "--version"]);
    try {
        base();
        return true;
    } catch (e) {
        // how do I unnest this shit
        try {
            python();
            return true;
        } catch (e) {
            return false;
        }
    }
}
