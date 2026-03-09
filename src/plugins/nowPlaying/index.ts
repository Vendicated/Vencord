/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and benzokones
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { sendMessage } from "@utils/discord";
import { findByPropsLazy } from "@webpack";

const Native = VencordNative.pluginHelpers.NowPlaying as PluginNative<typeof import("./native")>;
const Spotify = findByPropsLazy("getPlayerState");

export const enum Source {
    Spotify,
    TextFile
}

const settings = definePluginSettings({
    source: {
        description: "Source for now playing information",
        type: OptionType.SELECT,
        options: [
            { label: "Spotify", value: Source.Spotify },
            { label: "Text File", value: Source.TextFile, default: true }
        ],
        default: Source.TextFile
    },
    textFilePath: {
        description: "Full path to text file",
        type: OptionType.STRING,
        default: "",
        placeholder: "nowplaying.txt",
        disabled: () => settings.store.source !== Source.TextFile
    },
    textFileFormat: {
        description: "Format of the text file",
        type: OptionType.STRING,
        default: "%artist% - %title%",
        placeholder: "e.g. %artist% - %title%",
        disabled: () => settings.store.source !== Source.TextFile
    },
    outputFormat: {
        description: "/now output format",
        type: OptionType.STRING,
        default: "_is listening to %artist% - %title%_",
        placeholder: "e.g. %artist% - %title%, %album%"
    },
});

function parseFileContent(content: string, format: string): Record<string, string> {
    let escapedFormat = format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regexStr = escapedFormat
        .replace(/%artist%/g, '(?<artist>.+?)')
        .replace(/%title%/g, '(?<title>.+?)')
        .replace(/%album%/g, '(?<album>.+?)');

    const regex = new RegExp(`^\\s*${regexStr}\\s*$`);
    const match = content.match(regex);
    if (!match || !match.groups) {
        throw new Error("file content does not match format");
    }
    return match.groups;
}

function formatOutput(template: string, data: Record<string, string>): string {
    return template.replace(/%(\w+)%/g, (_, key) => data[key] || '');
}

export default definePlugin({
    name: "NowPlaying",
    description: "Implements /now command to tell EVERYONE what you are listening to.",
    authors: [Devs.benzokones],
    settings,
    commands: [
        {
            name: "now",
            description: "Show what you're currently playing.",
            inputType: ApplicationCommandInputType.BUILT_IN,

            execute: async (_, ctx) => {
                const source = settings.store.source;
                const outputFormat = settings.store.outputFormat;

                try {
                    if (source === Source.TextFile) {
                        const filePath = settings.store.textFilePath;
                        if (!filePath) {
                            throw new Error("file path not set");
                        }

                        let resolvedPath = filePath;
                        if (filePath.startsWith('~')) {
                            const homeDir = await Native.getHomeDir();
                            resolvedPath = await Native.joinPath(homeDir, filePath.slice(1));
                        }

                        const stats = await Native.stat(resolvedPath);
                        if (stats.size > (1024 * 1024)) {
                            throw new Error("file too large");
                        }

                        const content = (await Native.readFile(resolvedPath)).trim();

                        const fileFormat = settings.store.textFileFormat;
                        const parsed = parseFileContent(content, fileFormat);
                        const message = formatOutput(outputFormat, parsed);

                        sendMessage(ctx.channel.id, { content: message });
                    } else if (source === Source.Spotify) {
                        const track = Spotify.getTrack();
                        if (!track) {
                            throw new Error("no spotify track playing or spotify not connected");
                        }

                        const data = {
                            artist: track.artists[0].name || "Unknown Artist",
                            title: track.name || "Unknown Song",
                            album: track.album?.name || "Unknown Album"
                        };

                        const message = formatOutput(outputFormat, data);
                        sendMessage(ctx.channel.id, { content: message });
                    }
                } catch (err) {
                    console.error("[NowPlaying] Error:", err);
                    sendBotMessage(ctx.channel.id, { content: `[NowPlaying] Error: ${err instanceof Error ? err.message : String(err)}` });
                }
            }
        }
    ]
});