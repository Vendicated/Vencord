/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

interface Album {
    id: string;
    image: {
        height: number;
        width: number;
        url: string;
    };
    name: string;
}

interface Artist {
    external_urls: {
        spotify: string;
    };
    href: string;
    id: string;
    name: string;
    type: "artist" | string;
    uri: string;
}

interface Track {
    id: string;
    album: Album;
    artists: Artist[];
    duration: number;
    isLocal: boolean;
    name: string;
}

const Spotify = findByPropsLazy("getPlayerState");
const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");

function sendMessage(channelId, message) {
    message = {
        // The following are required to prevent Discord from throwing an error
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

export default definePlugin({
    name: "SpotifyShareCommands",
    description: "Share your current Spotify track, album or artist via slash command (/track, /album, /artist)",
    authors: [Devs.katlyn],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "track",
            description: "Send your current Spotify track to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                // Note: Due to how Discord handles commands, we need to manually create and send the message
                sendMessage(ctx.channel.id, {
                    content: `https://open.spotify.com/track/${track.id}`
                });
            }
        },
        {
            name: "album",
            description: "Send your current Spotify album to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                sendMessage(ctx.channel.id, {
                    content: `https://open.spotify.com/album/${track.album.id}`
                });
            }
        },
        {
            name: "artist",
            description: "Send your current Spotify artist to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                sendMessage(ctx.channel.id, {
                    content: track.artists[0].external_urls.spotify
                });
            }
        }
    ]
});
