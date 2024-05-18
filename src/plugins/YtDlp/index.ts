/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { DraftType, FluxDispatcher, UploadHandler, UploadManager, UserStore } from "@webpack/common";

const DATA_KEY = "YtDlp_binary";

const getYtDlp = async () => (await DataStore.get<ArrayBuffer | null>(DATA_KEY)) ?? null;
const setYtDlp = (ytDlp: ArrayBuffer) => DataStore.set(DATA_KEY, ytDlp);
// const delYtDlp = () => DataStore.del(DATA_KEY); // probably don't need this, it's only 17MiB :3

const Native = VencordNative.pluginHelpers.YtDlp as PluginNative<typeof import("./native")>;

const maxFileSize = () => {
    const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
    if (premiumType > 1) return 500000000; // 500MB
    if (premiumType > 0) return 50000000; // 50MB
    return 25000000; // 25MB
};
// Remove all lines that start with [download] except the last one
const formatStdout = (stdout: string) => stdout.replace(/\[download\][\S\s]*(?=\[download\])/gm, "");
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

async function sendProgress(channelId: string, promise: Promise<any>) {
    if (!settings.store.showProgress) return await promise;
    // Hacky way to send info from native to renderer for progress updates
    const clydeMessage = sendBotMessage(channelId, { content: "Downloading video..." });
    const updateMessage = (stdout: string, done?: boolean) => {
        const text = stdout.toString();
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                ...clydeMessage,
                content: `Downloading video...\n\`\`\`\n${formatStdout(text)}\n\`\`\`${done ? "\nDone!" : ""}`,
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
    updateMessage(stdout, true);
    return data;
}
async function checkffmpeg() {
    const res = await Native.checkffmpeg();
    if (!res) {
        showNotification({
            title: "yt-dlp",
            body: "ffmpeg not found. yt-dlp requires ffmpeg to work."
        });
    }
    return res;
}

const settings = definePluginSettings({
    additionalArguments: {
        type: OptionType.STRING,
        description: "Additional arguments to pass to yt-dlp. Format: JSON-parsable array of strings, e.g. [\"--format\", \"bestvideo+bestaudio\"]",
        default: "[]",
        restartNeeded: false,
        placeholder: '["--format", "bestvideo+bestaudio"]',
    },
    showProgress: {
        type: OptionType.BOOLEAN,
        description: "Send a Clyde message with the download progress.",
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "yt-dlp",
    description: "Download and send videos with yt-dlp",
    authors: [{ name: "colorman", id: 298842558610800650n }],
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
                // { name: "GIF", value: "gif", label: "GIF" }
            ],
            required: false
        }, {
            name: "additional args",
            description: "Additional JSON-parsable array of arguments to pass to yt-dlp. These will take precedence over arguments set in the settings.",
            required: false,
            type: ApplicationCommandOptionType.STRING
        }],

        execute: async (args, ctx) => {
            if (!await checkffmpeg()) return;
            const url = findOption<string>(args, "url", "");
            const format = findOption<"video" | "audio" | "gif">(args, "format", "video");
            const add_args = findOption<string>(args, "additional args", "");

            const promise = Native.download(url, {
                format,
                additional_arguments: [
                    ...parseAdditionalArgs(settings.store.additionalArguments),
                    ...parseAdditionalArgs(add_args)
                ],
                max_file_size: maxFileSize()
            });

            const data = await sendProgress(ctx.channel.id, promise);

            if ("error" in data) {
                return sendBotMessage(ctx.channel.id, {
                    content: `Failed to download video: ${data.error}`
                });
            }

            const { buffer, title } = data;
            UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
            const file = new File([buffer], title, { type: "video/mp4" });
            // See petpet
            setTimeout(() => UploadHandler.promptToUpload([file], ctx.channel, DraftType.ChannelMessage), 10);
        }
    }],
    start: async () => {
        if (!await checkffmpeg()) return;

        // Download yt-dlp binaries and stuff
        const ytDlp = await getYtDlp();
        const newYtDlp = await Native.start(ytDlp);

        switch (newYtDlp) {
            case "reused":
                break;
            case "error":
                showNotification({
                    title: "yt-dlp",
                    body: "Failed to download yt-dlp binary. Please check the log."
                });
                break;
            default:
                showNotification({
                    title: "yt-dlp",
                    body: "yt-dlp binary downloaded"
                });
                await setYtDlp(newYtDlp);
                break;
        }
    },
    stop: async () => {
        // Clean up the temp files
        await Native.stop();
    }
});
