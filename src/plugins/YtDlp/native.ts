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

type Format = "video" | "audio" | "gif";
type DownloadOptions = {
    url: string;
    format?: Format;
    gifQuality?: 1 | 2 | 3 | 4 | 5;
    additional_arguments?: string[];
    maxFileSize?: number;
};

let workdir: string | null = null;
let stdout_global: string = "";

let ytdlpAvailable = false;
let ffmpegAvailable = false;

const getdir = () => workdir ?? process.cwd();
const p = (file: string) => path.join(getdir(), file);
const cleanVideoFiles = () => {
    if (!workdir) return;
    fs.readdirSync(workdir)
        .filter(f => f.startsWith("download.") || f.startsWith("remux."))
        .forEach(f => fs.unlinkSync(p(f)));
};
const appendOut = (data: string) => ( // Makes carriage return (\r) work
    (stdout_global += data), (stdout_global = stdout_global.replace(/^.*\r([^\n])/gm, "$1")));
const log = (...data: string[]) => console.log(`[Plugin:yt-dlp] ${data.join(" ")}`);
const error = (...data: string[]) => console.error(`[Plugin:yt-dlp] [ERROR] ${data.join(" ")}`);
function ytdlp(args: string[]): Promise<string> {
    let errorMsg = "";

    return new Promise<string>((resolve, reject) => {
        const yt = spawn("yt-dlp", args, {
            cwd: getdir(),
        });

        yt.stdout.on("data", data => appendOut(data));
        yt.stderr.on("data", data => {
            appendOut(data);
            error(`yt-dlp encountered an error: ${data}`);
            errorMsg += data;
        });
        yt.on("exit", code => {
            code === 0 ? resolve(stdout_global) : reject(new Error(errorMsg || `yt-dlp exited with code ${code}`));
        });
    });
}
function ffmpeg(args: string[]): Promise<string> {
    let errorMsg = "";

    return new Promise<string>((resolve, reject) => {
        const yt = spawn("ffmpeg", args, {
            cwd: getdir(),
        });

        yt.stdout.on("data", data => appendOut(data));
        yt.stderr.on("data", data => {
            appendOut(data);
            error(`ffmpeg encountered an error: ${data}`);
            errorMsg += data;
        });
        yt.on("exit", code => {
            code === 0 ? resolve(stdout_global) : reject(new Error(errorMsg || `ffmpeg exited with code ${code}`));
        });
    });

}

export async function start(_: IpcMainInvokeEvent, _workdir: string | undefined) {
    _workdir ||= fs.mkdtempSync(path.join(os.tmpdir(), "vencord_ytdlp_"));
    if (!fs.existsSync(_workdir)) fs.mkdirSync(_workdir, { recursive: true });
    workdir = _workdir;
    log("Using workdir: ", workdir);
    return workdir;
}
export async function stop(_: IpcMainInvokeEvent) {
    if (workdir) {
        log("Cleaning up workdir");
        fs.rmSync(workdir, { recursive: true });
        workdir = null;
    }
}

async function metadata(options: DownloadOptions) {
    stdout_global = "";
    const metadata = JSON.parse(await ytdlp(["-J", options.url, "--no-warnings"]));
    if (metadata.is_live) throw "Live streams are not supported.";
    stdout_global = "";
    return { videoTitle: metadata.title || "video" };
}
function genFormat({ videoTitle }: { videoTitle: string; }, { maxFileSize, format }: DownloadOptions) {
    const HAS_LIMIT = !!maxFileSize;
    const MAX_VIDEO_SIZE = HAS_LIMIT ? maxFileSize * 0.8 : 0;
    const MAX_AUDIO_SIZE = HAS_LIMIT ? maxFileSize * 0.2 : 0;

    const audio = {
        noFfmpeg: "ba[ext=mp3]{TOT_SIZE}/wa[ext=mp3]{TOT_SIZE}",
        ffmpeg: "ba*{TOT_SIZE}/ba{TOT_SIZE}/wa*{TOT_SIZE}/ba*"
    };
    const video = {
        noFfmpeg: "b{TOT_SIZE}{HEIGHT}[ext=webm]/b{TOT_SIZE}{HEIGHT}[ext=mp4]/w{HEIGHT}{TOT_SIZE}",
        ffmpeg: "b*{VID_SIZE}{HEIGHT}+ba{AUD_SIZE}/b{TOT_SIZE}{HEIGHT}/b*{HEIGHT}+ba",
    };
    const gif = {
        ffmpeg: "bv{TOT_SIZE}/wv{TOT_SIZE}"
    };

    let format_group: { noFfmpeg?: string; ffmpeg: string; };
    switch (format) {
        case "audio":
            format_group = audio;
            break;
        case "gif":
            format_group = gif;
            break;
        case "video":
        default:
            format_group = video;
            break;
    }

    const format_string = (ffmpegAvailable ? format_group.ffmpeg : format_group.noFfmpeg)
        ?.replaceAll("{TOT_SIZE}", HAS_LIMIT ? `[filesize<${maxFileSize}]` : "")
        .replaceAll("{VID_SIZE}", HAS_LIMIT ? `[filesize<${MAX_VIDEO_SIZE}]` : "")
        .replaceAll("{AUD_SIZE}", HAS_LIMIT ? `[filesize<${MAX_AUDIO_SIZE}]` : "")
        .replaceAll("{HEIGHT}", "[height<=1080]");
    if (!format_string) throw "Gif format is only supported with ffmpeg.";
    log("Video formated calculated as ", format_string);
    log(`Based on: format=${format}, maxFileSize=${maxFileSize}, ffmpegAvailable=${ffmpegAvailable}`);
    return { format: format_string, videoTitle };
}
async function download({ format, videoTitle }: { format: string; videoTitle: string; }, { additional_arguments, url, format: usrFormat }: DownloadOptions) {
    cleanVideoFiles();
    const baseArgs = ["-f", format, "-o", "download.%(ext)s", "--force-overwrites", "-I", "1"];
    const remuxArgs = ffmpegAvailable
        ? usrFormat === "video"
            ? ["--remux-video", "webm>webm/mp4"]
            : usrFormat === "audio"
                ? ["--remux-audio", "mp3"]
                : []
        : [];
    const customArgs = additional_arguments?.filter(Boolean) || [];

    await ytdlp([url, ...baseArgs, ...remuxArgs, ...customArgs]);
    const file = fs.readdirSync(getdir()).find(f => f.startsWith("download."));
    if (!file) throw "No video file was found!";
    return { file, videoTitle };
}
async function remux({ file, videoTitle }: { file: string; videoTitle: string; }, { format, maxFileSize, gifQuality }: DownloadOptions) {
    const sourceExtension = file.split(".").pop();
    if (!ffmpegAvailable) return { file, videoTitle, extension: sourceExtension };

    // We only really need to remux if
    // 1. The file is too big
    // 2. The file is in a format not supported by discord
    const acceptableFormats = ["mp3", "mp4", "webm"];
    const fileSize = fs.statSync(p(file)).size;
    if (acceptableFormats.includes(sourceExtension ?? "") && (!maxFileSize || fileSize <= maxFileSize)) return { file, videoTitle, extension: sourceExtension };

    const duration = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", p(file)]).toString());
    if (isNaN(duration)) throw "Failed to get video duration.";
    // ffmpeg tends to go above the target size, so I'm setting it to 7/8
    const targetBits = maxFileSize ? (maxFileSize * 7) / duration : 9999999;
    const kilobits = ~~(targetBits / 1024);

    let ffmpegArgs: string[] = [];
    let ext = "";
    switch (format) {
        case "audio":
            ffmpegArgs = ["-i", p(file), "-b:a", `${kilobits}k`, "-maxrate", `${kilobits}k`, "-bufsize", "1M", "-y", p("remux.mp3")];
            ext = "mp3";
            break;
        case "video":
            // Dynamically resize based on target bitrate
            const height = kilobits <= 100 ? 480 : kilobits <= 500 ? 720 : 1080;
            ffmpegArgs = ["-i", p(file), "-b:v", `${~~(kilobits * 0.8)}k`, "-b:a", `${~~(kilobits * 0.2)}k`, "-maxrate", `${kilobits}`, "-bufsize", "1M", "-y", "-filter:v", `scale=-1:${height}`, p("remux.mp4")];
            ext = "mp4";
            break;
        case "gif":
            let fps: number, width: number, colors: number, bayer_scale: number;
            // WARNING: these parameters have been arbitrarily chosen, optimization is welcome!
            switch (gifQuality) {
                case 1:
                    fps = 5, width = 360, colors = 24, bayer_scale = 5;
                    break;
                case 2:
                    fps = 10, width = 420, colors = 32, bayer_scale = 5;
                    break;
                default:
                case 3:
                    fps = 15, width = 480, colors = 64, bayer_scale = 4;
                    break;
                case 4:
                    fps = 20, width = 540, colors = 64, bayer_scale = 3;
                    break;
                case 5:
                    fps = 30, width = 720, colors = 128, bayer_scale = 1;
                    break;
            }

            ffmpegArgs = ["-i", p(file), "-vf", `fps=${fps},scale=w=${width}:h=-1:flags=lanczos,mpdecimate,split[s0][s1];[s0]palettegen=max_colors=${colors}[p];[s1][p]paletteuse=dither=bayer:bayer_scale=${bayer_scale}`, "-loop", "0", "-bufsize", "1M", "-y", p("remux.gif")];
            ext = "gif";
            break;
        default:
            break;
    }

    if (!ffmpegArgs.length) throw "Invalid format.";
    if (!ext) throw "Invalid extension.";
    await ffmpeg(ffmpegArgs);
    return { file: `remux.${ext}`, videoTitle, extension: ext };
}
function upload({ file, videoTitle, extension }: { file: string; videoTitle: string; extension: string | undefined; }) {
    if (!extension) throw "Invalid extension.";
    const buffer = fs.readFileSync(p(file));
    return { buffer, title: `${videoTitle}.${extension}` };
}
export async function execute(
    _: IpcMainInvokeEvent,
    opt: DownloadOptions
): Promise<{
    buffer: Buffer;
    title: string;
} | {
    error: string;
}> {
    try {
        const m = await metadata(opt);
        const f = genFormat(m, opt);
        const d = await download(f, opt);
        const r = await remux(d, opt);
        const u = upload(r);
        return u;
    } catch (e: any) {
        return { error: e.toString() };
    }
}

export function checkffmpeg(_?: IpcMainInvokeEvent) {
    try {
        execFileSync("ffmpeg", ["-version"]);
        execFileSync("ffprobe", ["-version"]);
        ffmpegAvailable = true;
        return true;
    } catch (e) {
        ffmpegAvailable = false;
        return false;
    }
}
export async function checkytdlp(_?: IpcMainInvokeEvent) {
    try {
        execFileSync("yt-dlp", ["--version"]);
        ytdlpAvailable = true;
        return true;
    } catch (e) {
        ytdlpAvailable = false;
        return false;
    }
}

export const getStdout = () => stdout_global;
export const isYtdlpAvailable = () => ytdlpAvailable;
export const isFfmpegAvailable = () => ffmpegAvailable;
