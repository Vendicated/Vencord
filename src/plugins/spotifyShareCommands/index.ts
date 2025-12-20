/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, findOption, OptionalMessageOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { Command } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, MessageActions } from "@webpack/common";

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
    id: string | null;
    album: Album;
    artists: Artist[];
    duration: number;
    isLocal: boolean;
    name: string;
}

const Spotify = findByPropsLazy("getPlayerState");
const PendingReplyStore = findByPropsLazy("getPendingReply");

function makeCommand(name: string, formatUrl: (track: Track) => string): Command {
    return {
        name,
        description: `Share your current Spotify ${name} in chat`,
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [OptionalMessageOption],
        execute(options, { channel }) {
            const track: Track | null = Spotify.getTrack();
            if (!track) {
                return sendBotMessage(channel.id, {
                    content: "You're not listening to any music."
                });
            }

            // local tracks have an id of null
            if (track.id == null) {
                return sendBotMessage(channel.id, {
                    content: "Failed to find the track on spotify."
                });
            }

            const data = formatUrl(track);
            const message = findOption(options, "message");

            // Note: Due to how Discord handles commands, we need to manually create and send the message

            sendMessage(
                channel.id,
                { content: message ? `${message} ${data}` : data },
                false,
                MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(channel.id))
            ).then(() => {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: channel.id });
            });

        }
    };
}

export default definePlugin({
    name: "SpotifyShareCommands",
    description: "Share your current Spotify track, album or artist via slash command (/track, /album, /artist)",
    authors: [Devs.katlyn],
    commands: [
        makeCommand("track", track => `https://open.spotify.com/track/${track.id}`),
        makeCommand("album", track => `https://open.spotify.com/album/${track.album.id}`),
        makeCommand("artist", track => track.artists[0].external_urls.spotify)
    ]
});
