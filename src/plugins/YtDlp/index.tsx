/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { DraftType, FluxDispatcher, UploadHandler, UploadManager, UserStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import { DependencyModal } from "./DependencyModal";

const Native = VencordNative.pluginHelpers.YtDlp as PluginNative<typeof import("./native")>;

const maxFileSize = () => {
    const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
    if (premiumType > 1) return 500000000; // 500MB
    if (premiumType > 0) return 50000000; // 50MB
    return 25000000; // 25MB
};
const parseAdditionalArgs = (args: string): string[] => {
    try {
        if (!args) return [];
        const parsed = JSON.parse(args);
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        if (!parsed.every(a => typeof a === "string")) throw new Error("Not all elements are strings");
        return parsed;
    } catch (e: any) {
        showNotification({
            title: "yt-dlp",
            body: "Failed to parse additional arguments: " + e?.message,
        });
        return [];
    }

};
function mimetype(extension: "mp4" | "webm" | "gif" | "mp3" | string) {
    switch (extension) {
        case "mp4":
            return "video/mp4";
        case "webm":
            return "video/webm";
        case "gif":
            return "image/gif";
        case "mp3":
            return "audio/mp3";
        default:
            return "application/octet-stream";
    }
}

async function sendProgress(channelId: string, promise: Promise<{
    buffer: Buffer;
    title: string;
} | {
    error: string;
}>) {
    if (!settings.store.showProgress) return await promise;
    // Hacky way to send info from native to renderer for progress updates
    const clydeMessage = sendBotMessage(channelId, { content: "Downloading video..." });
    const updateMessage = (stdout: string, append?: string) => {
        const text = stdout.toString();
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                ...clydeMessage,
                content: `Downloading video...\n\`\`\`\n${text}\n\`\`\`${append || ""}`,
            }
        });
    };
    const id = setInterval(async () => {
        const stdout = await Native.getStdout();
        updateMessage(stdout);
    }, 500);

    const data = await promise;
    clearInterval(id);
    const stdout = await Native.getStdout();
    updateMessage(stdout, "error" in data ? "Error!" : "Done!");
    return data;
}

function sendFfmpegWarning(channelId: string) {
    sendBotMessage(channelId, {
        content: "FFmpeg not detected. You may experience lower download quality and missing features."
    });
}

// Mostly taken from viewRaw and betterSessions plugins.
async function openDependencyModal() {
    const key = openModal(props => (
        <ErrorBoundary>
            <DependencyModal props={props} options={{
                key,
                checkffmpeg: Native.checkffmpeg,
                checkytdlp: Native.checkytdlp,
            }} />
        </ErrorBoundary>
    ));
}

const settings = definePluginSettings({
    additionalArguments: {
        type: OptionType.STRING,
        description: "Additional arguments to pass to yt-dlp. Format: JSON-parsable array of strings, e.g. [\"--format\", \"bestvideo+bestaudio\"]",
        default: "[]",
        placeholder: '["--format", "bestvideo+bestaudio"]',
    },
    showProgress: {
        type: OptionType.BOOLEAN,
        description: "Send a Clyde message with the download progress.",
        default: true,
    },
    showFfmpegWarning: {
        type: OptionType.BOOLEAN,
        description: "Show a warning message if ffmpeg is not installed.",
        default: true,
    },
    defaultGifQuality: {
        type: OptionType.NUMBER,
        description: "The quality level to use if no value is specified when downloading gifs. A number between 1 and 5.",
        default: 3,
    }
}, {
    additionalArguments: {
        isValid(value) {
            try {
                JSON.parse(value);
                return true;
            } catch {
                return false;
            }
        },
    },
    defaultGifQuality: {
        isValid(value) {
            return value >= 1 && value <= 5;
        }
    }
});

export default definePlugin({
    name: "yt-dlp",
    description: "Download and send videos with yt-dlp.",
    authors: [Devs.Colorman],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [{
        inputType: ApplicationCommandInputType.BUILT_IN,
        name: "yt-dlp",
        description: "Download and send videos with yt-dlp",
        options: [{
            name: "url",
            description: "The URL of any video supported by yt-dlp.",
            required: true,
            type: ApplicationCommandOptionType.STRING
        }, {
            name: "format",
            description: "Whether to download a video or audio.",
            type: ApplicationCommandOptionType.STRING,
            choices: [
                { name: "Video", value: "video", label: "Video" },
                { name: "Audio", value: "audio", label: "Audio" },
                { name: "GIF", value: "gif", label: "GIF" }
            ],
            required: false,
        }, {
            name: "gif_quality",
            type: ApplicationCommandOptionType.INTEGER,
            description: "The quality level when using GIF. Try lowering this number if the GIF is too large.",
            required: false,
            choices: [
                { name: "5", value: "5", label: "5" },
                { name: "4", value: "4", label: "4" },
                { name: "3", value: "3", label: "3" },
                { name: "2", value: "2", label: "2" },
                { name: "1", value: "1", label: "1" }
            ]
        }, {
            name: "additional_args",
            description: "Additional JSON-parsable array of arguments to pass to yt-dlp. These will take precedence over arguments set in the settings.",
            required: false,
            type: ApplicationCommandOptionType.STRING
        }],

        execute: async (args, ctx) => {
            if (!await Native.isYtdlpAvailable()) return openDependencyModal();
            if (!await Native.isFfmpegAvailable() && settings.store.showFfmpegWarning) sendFfmpegWarning(ctx.channel.id);

            const url = findOption<string>(args, "url", "");
            const format = findOption<"video" | "audio" | "gif">(args, "format", "video");
            const gifQuality = parseInt(findOption<string>(args, "gif_quality", settings.store.defaultGifQuality.toString())) as 1 | 2 | 3 | 4 | 5;
            const addArgs = findOption<string>(args, "additional_args", "");

            return await download(ctx.channel, {
                url,
                format,
                gifQuality,
                addArgs
            });
        }
    }, {
        description: "test",
        name: "test",
        execute: async (args, ctx) => {
            openDependencyModal();
        }
    }],
    start: async () => {
        await Native.checkytdlp();
        await Native.checkffmpeg();

        const videoDir = await DataStore.get<string>("yt-dlp-video-dir");
        const newVideoDir = await Native.start(videoDir);
        await DataStore.set("yt-dlp-video-dir", newVideoDir);
    },
    stop: async () => {
        // Clean up the temp files
        await Native.stop();
        await DataStore.del("yt-dlp-video-dir");
    }
});

async function download(channel: Channel, {
    url, format, addArgs, gifQuality
}: {
    url: string;
    format: "video" | "audio" | "gif";
    addArgs: string;
    gifQuality: 1 | 2 | 3 | 4 | 5;
}) {
    const promise = Native.execute({
        url,
        format,
        gifQuality,
        additional_arguments: [
            ...parseAdditionalArgs(settings.store.additionalArguments),
            ...parseAdditionalArgs(addArgs)
        ],
        maxFileSize: maxFileSize()
    });

    const data = await sendProgress(channel.id, promise);

    if ("error" in data) {
        // Open the modal if the error is due to missing formats (could be fixed by downloading ffmpeg)
        if (data.error.includes("--list-formats") && !(await Native.isFfmpegAvailable()))
            return sendBotMessage(channel.id, { content: "No good streams found. Consider installing ffmpeg to increase the likelihood of a successful stream." }), openDependencyModal();

        return sendBotMessage(channel.id, {
            content: `Failed to download video: \`${data.error}\``
        });
    }

    const { buffer, title } = data;
    UploadManager.clearAll(channel.id, DraftType.SlashCommand);
    const file = new File([buffer], title, { type: mimetype(title.split(".")[1]) });
    // See petpet
    setTimeout(() => UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage), 10);
}
