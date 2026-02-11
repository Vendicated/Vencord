import { readFile, unlink, writeFile } from "node:fs/promises";

import { spawn } from "child_process";
import { IpcMainInvokeEvent } from "electron";
import os from "os";
import path from "path";

import { pullBinary, resolveBinary } from "./resolve";

type CompressResult =
    | { success: true; data: Uint8Array; }
    | { success: false; error: string; };


export async function testBinaries(
    _: IpcMainInvokeEvent,
    ffmpegPath: string | undefined,
    ffprobePath: string | undefined
) {
    try {
        await resolveBinary(ffmpegPath, "ffmpeg");
        await resolveBinary(ffprobePath, "ffprobe");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}


export async function handleFile(
    _: IpcMainInvokeEvent,
    fileData: Uint8Array,
    fileName: string,
    target: number,
    preset: string,
    resolution: string,
    timeout: number
): Promise<CompressResult> {
    const fileExt = path.extname(fileName) || ".mp4";
    const temp = os.tmpdir();
    const inPath = path.join(temp, `ac_in_${Date.now()}${fileExt}`);
    const outPath = path.join(temp, `ac_out_${Date.now()}${fileExt}`);

    try {
        const fileBuf = Buffer.from(fileData);
        await writeFile(inPath, fileBuf);

        const duration = await getVideoDuration(inPath);

        const tgBits = target * 8 * 1024 * 1024;
        const audioBitrate = 128;
        const videoBitrate = Math.floor(tgBits / duration / 1000);

        if (videoBitrate < 100) {
            await cleanup(inPath);
            return {
                success: false,
                error: `target bitrate too low (${videoBitrate}k)`,
            };
        }

        await compressVideo(inPath, outPath, videoBitrate, audioBitrate, preset, resolution, timeout);

        const res = await readFile(outPath);
        await cleanup(inPath, outPath);
        return { success: true, data: res };
    } catch (err: any) {
        await cleanup(inPath, outPath);
        return {
            success: false,
            error: err?.message || err?.toString() || "unk error",
        };
    }
}

function getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn(pullBinary("ffprobe"), [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            inputPath,
        ]);

        let out = "";
        let errOut = "";
        ffprobe.stdout.on("data", data => {
            out += data.toString();
        });

        ffprobe.stderr.on("data", data => {
            errOut += data.toString();
        });

        ffprobe.on("close", code => {
            if (code !== 0) {
                reject(new Error(`ffprobe exited with ${code}, ${errOut.trim()}`));
                return;
            }

            const duration = parseFloat(out.trim());
            if (isNaN(duration) || duration <= 0) {
                reject(new Error("ffprobe invalid data"));
                return;
            }

            resolve(duration);
        });

        ffprobe.on("error", err => {
            reject(new Error(`failed to spawn ffprobe: ${err.message}`));
        });
    });
}

function compressVideo(
    inputPath: string,
    outputPath: string,
    vidBitrate: number,
    audioBitrate: number,
    preset: string,
    maxResolution: string,
    ffmpegTimeout: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const args = [
            "-y",
            "-i",
            inputPath,
            "-c:v",
            "libx264",
            "-b:v",
            `${vidBitrate}k`,
            "-maxrate",
            `${vidBitrate}k`,
            "-bufsize",
            `${vidBitrate * 2}k`,
            "-preset",
            preset,
        ];

        if (maxResolution !== "original") {
            const resolutionMap: Record<string, string> = {
                "1080":
                    "scale='min(iw,1920)':'min(ih,1080)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "720":
                    "scale='min(iw,1280)':'min(ih,720)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "480":
                    "scale='min(iw,854)':'min(ih,480)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
            };
            args.push("-vf", resolutionMap[maxResolution]);
        }

        args.push(
            "-c:a",
            "aac",
            "-b:a",
            `${audioBitrate}k`,
            "-map_metadata",
            "0",
            "-movflags",
            "+faststart",
            outputPath,
        );

        const ffmpeg = spawn(pullBinary("ffmpeg"), args);

        let errOut = "";

        ffmpeg.stderr.on("data", data => {
            errOut += data.toString();
        });
        setTimeout(() => {
            ffmpeg.kill();
            reject(new Error(`ffmpeg exceeded alloted time of ${ffmpegTimeout / 1000}`));
            return;
        }, ffmpegTimeout);
        ffmpeg.on("close", code => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`ffmpeg exited with code ${code}, ${errOut}`));
        });

        ffmpeg.on("error", err => {
            reject(new Error(`ffmpeg spawn error ${err}. stderr: ${errOut}`));
            return;
        });
    });
}

async function cleanup(...paths: string[]): Promise<void> {
    await Promise.allSettled(paths.map(p => unlink(p)));
}
