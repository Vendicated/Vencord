/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

interface IVoiceFilter {
    name: string;
    author: string;
    onnxFileUrl: string;
    iconURL: string;
    id: string;
    styleKey: string;
    available: boolean;
    temporarilyAvailable: boolean;

    custom?: boolean;
    splashGradient?: string;
    baseColor?: string;
    previewSoundURLs?: string[];
    downloadUrl?: string;
}

const fs = require("fs");

export async function downloadCustomVoiceFilter(_: IpcMainInvokeEvent, modulePath: string, voiceFilter: IVoiceFilter): Promise<{ success: boolean, voiceFilter: IVoiceFilter, path: string | null, response: Response | null; }> {
    if (!fs.existsSync(modulePath + "/discord_voice_filters")) {
        fs.mkdirSync(modulePath + "/discord_voice_filters");
    }
    if (!voiceFilter.onnxFileUrl ||
        fs.existsSync(modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx") ||
        !voiceFilter.onnxFileUrl.endsWith(".onnx")
    ) {
        return {
            success: false,
            response: null,
            voiceFilter: voiceFilter,
            path: null
        };
    }
    const response = await fetch(voiceFilter.onnxFileUrl);
    if (!response.ok) {
        return {
            success: false,
            response: response,
            voiceFilter: voiceFilter,
            path: null
        };
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx", Buffer.from(arrayBuffer));
    return {
        success: true,
        response: response,
        voiceFilter: voiceFilter,
        path: modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx"
    };
}

export async function downloadCustomVoiceFilterFromBuffer(_: IpcMainInvokeEvent, modulePath: string, voiceFilter: IVoiceFilter, buffer: ArrayBuffer) {
    if (!fs.existsSync(modulePath + "/discord_voice_filters")) {
        fs.mkdirSync(modulePath + "/discord_voice_filters");
    }
    fs.writeFileSync(modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx", Buffer.from(buffer));
    return {
        success: true,
        voiceFilter: voiceFilter,
        path: modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx"
    };
}
export async function getModelState(_: IpcMainInvokeEvent, id: string, modulePath: string) {
    const modelPath = modulePath + "/discord_voice_filters/";
    return {
        status: fs.existsSync(modelPath + id + ".onnx") ? "downloaded" : "not_downloaded",
        downloadedBytes: fs.existsSync(modelPath + id + ".onnx") ? fs.statSync(modelPath + id + ".onnx").size : 0
    };
}

export async function deleteModel(_: IpcMainInvokeEvent, modulePath: string, id: string) {
    const modelPath = modulePath + "/discord_voice_filters/";
    fs.unlinkSync(modelPath + id + ".onnx");
}

export async function deleteAllModels(_: IpcMainInvokeEvent, modulePath: string) {
    const modelPath = modulePath + "/discord_voice_filters/";
    fs.rmSync(modelPath, { recursive: true, force: true });
}

export async function openFolder(_: IpcMainInvokeEvent, modulePath: string) {
    const process = require("child_process");
    process.exec(`start "" "${modulePath}/discord_voice_filters/"`);
}
