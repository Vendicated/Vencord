/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative, ReporterTestable } from "@utils/types";
import { Button, DraftType, FluxDispatcher, Forms, UploadHandler, UploadManager, UserStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import { DependencyModal } from "./DependencyModal";

type ButtonComponent = {
    customId?: string;
    disabled?: boolean;
    emoji?: {
        animated?: boolean | string;
        id?: string;
        name?: string;
        src?: string;
    };
    id: string;
    label?: string;
    style: number;
    type: number;
    url?: string;
};

const Native = VencordNative.pluginHelpers.MediaDownloader as PluginNative<typeof import("./native")>;
const logger = new Logger("MediaDownloader", "#ff0b01");

const maxFileSize = () => {
    const premiumType = (UserStore.getCurrentUser().premiumType ?? 0);
    if (premiumType > 1) return 500000000; // 500MB
    if (premiumType > 0) return 50000000; // 50MB
    return 25000000; // 25MB
};
/** Takes a string and splits it into an array of arguments. */
const argParse = (args: string): string[] => args.match(
    /(?:[^\s"']+|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s]+))/g
) ?? [];

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

const CancelButton = [{
    components: [{
        customId: "media-downloader-stop-download", // ! for some reason customId is always undefined, so I'm just saving the id in the emoji animated field :3
        emoji: {
            name: "⚪",
            animated: "media-downloader-stop-download"
        },
        label: "Cancel download",
        id: "0,0",
        style: 4,
        type: 2,
    }], id: "0", type: 1
}];
async function sendProgress(channelId: string, promise: Promise<{
    buffer: Buffer;
    title: string;
    logs: string;
} | {
    error: string;
    logs: string;
}>) {
    if (!settings.store.showProgress) {
        sendBotMessage(channelId, {
            components: CancelButton
        });
        return await promise;
    }
    const clydeMessage = sendBotMessage(channelId, {
        content: "Downloading video...",
        components: CancelButton
    });
    const updateMessage = (stdout: string, append?: string) => {
        const text = stdout.toString();
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                ...clydeMessage,
                content: `Downloading video...\n\`\`\`\n${text}\n\`\`\`${append || ""}`,
                components: append ? [] : clydeMessage.components
            }
        });
    };
    // Hacky way to send info from native to renderer for progress updates
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
    supportedWebsites: {
        description: "See the link for a list of supported websites.",
        type: OptionType.COMPONENT,
        default: "none",
        component: () => (
            <>
                <Forms.FormText>
                    <Link href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md" className="media-downloader-link">
                        <Button role="link" style={{ width: "100%" }}>
                            Click to see supported websites.
                        </Button>
                    </Link>
                </Forms.FormText>
                <Forms.FormDivider />
            </>
        )
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
    },
    ytdlpArgs: {
        type: OptionType.STRING,
        description: "Additional arguments to pass to yt-dlp. This may overwrite default plugin arguments such format selection. Note: if modifying the ouptup, ensure the filename starts with `download`.",
        placeholder: "--format bestvideo+bestaudio",
    },
    ffmpegArgs: {
        type: OptionType.STRING,
        description: "Additional arguments to pass to ffmpeg. This may overwrite default plugin arguments such as auto-scaling. Note: if modifying the output, ensure the filename starts with `remux`.",
        placeholder: "-vf scale=1280:720",
    }
}, {
    defaultGifQuality: {
        isValid(value) {
            return value >= 1 && value <= 5;
        }
    }
});

export default definePlugin({
    name: "MediaDownloader",
    description: "Download and send videos with from YouTube, Twitter, Reddit and more.",
    authors: [EquicordDevs.Colorman],
    reporterTestable: ReporterTestable.Patches,
    settings,
    commands: [{
        inputType: ApplicationCommandInputType.BUILT_IN,
        name: "download",
        description: "Download and send videos, audio or gifs.",
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
            name: "yt-dlp_args",
            description: "Additional arguments to pass to yt-dlp. These will take precedence over arguments set in the settings. This may overwrite default plugin arguments such format selection. Note: if modifying the output, ensure the filename starts with `download`.",
            required: false,
            type: ApplicationCommandOptionType.STRING
        }, {
            name: "ffmpeg_args",
            description: "Additional arguments to pass to ffmpeg. These will take precedence over arguments set in the settings. This may overwrite default plugin arguments such as auto-scaling. Note: if modifying the output, ensure the filename starts with `remux`.",
            required: false,
            type: ApplicationCommandOptionType.STRING
        }],

        execute: async (args, ctx) => {
            if (!await Native.isYtdlpAvailable()) return openDependencyModal();
            if (!await Native.isFfmpegAvailable() && settings.store.showFfmpegWarning) sendFfmpegWarning(ctx.channel.id);

            const url = findOption<string>(args, "url", "");
            const format = findOption<"video" | "audio" | "gif">(args, "format", "video");
            const gifQuality = parseInt(findOption<string>(args, "gif_quality", settings.store.defaultGifQuality.toString())) as 1 | 2 | 3 | 4 | 5;
            const ytdlpArgs = findOption<string>(args, "yt-dlp_args", "");
            const ffmpegArgs = findOption<string>(args, "ffmpeg_args", "");

            return await download(ctx.channel, {
                url,
                format,
                gifQuality,
                ytdlpArgs,
                ffmpegArgs
            });
        }
    }],
    patches: [
        {
            find: "missing validator for this component",
            replacement: {
                match: /(\i)(\.type\)\{case \i\.\i\.BUTTON):return null;/,
                replace: "$1$2:return ($self.handleButtonClick($1),null);"
            }
        }
    ],
    handleButtonClick: (buttonComponent: ButtonComponent) => {
        if (!(buttonComponent.emoji?.animated === "media-downloader-stop-download")) return;
        Native.interrupt();
    },
    start: async () => {
        await Native.checkytdlp();
        await Native.checkffmpeg();

        const videoDir = await DataStore.get<string>("media-downloader-video-dir");
        const newVideoDir = await Native.start(videoDir);
        await DataStore.set("media-downloader-video-dir", newVideoDir);
    },
    stop: async () => {
        // Clean up the temp files
        await Native.stop();
        await DataStore.del("media-downloader-video-dir");
    }
});

async function download(channel: Channel, {
    url, format, ytdlpArgs, ffmpegArgs, gifQuality
}: {
    url: string;
    format: "video" | "audio" | "gif";
    ytdlpArgs: string;
    ffmpegArgs: string;
    gifQuality: 1 | 2 | 3 | 4 | 5;
}) {
    const promise = Native.execute({
        url,
        format,
        gifQuality,
        ytdlpArgs: [
            ...argParse(settings.store.ytdlpArgs || ""),
            ...argParse(ytdlpArgs)
        ],
        ffmpegArgs: [
            ...argParse(settings.store.ffmpegArgs || ""),
            ...argParse(ffmpegArgs)
        ],
        maxFileSize: maxFileSize()
    });

    const data = await sendProgress(channel.id, promise);

    for (const log of data.logs.trim().split("\n")) logger.info(log);

    if ("error" in data) {
        // Open the modal if the error is due to missing formats (could be fixed by downloading ffmpeg)
        if (data.error.includes("--list-formats") && !(await Native.isFfmpegAvailable()))
            return sendBotMessage(channel.id, { content: "No good streams found. Consider installing ffmpeg to increase the likelihood of a successful stream." }), openDependencyModal();

        return sendBotMessage(channel.id, {
            content: `Failed to download video: ${data.error.includes("\n") ? "\n```" + data.error + "\n```" : `\`${data.error}\``}`
        });
    }

    const { buffer, title } = data;
    UploadManager.clearAll(channel.id, DraftType.SlashCommand);
    const file = new File([buffer], title, { type: mimetype(title.split(".")[1]) });
    // See petpet
    setTimeout(() => UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage), 10);
}
