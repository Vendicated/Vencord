import definePlugin from "../utils/types";
import { lazyWebpack } from "../utils";
import { filters } from "../webpack";
import { ApplicationCommandInputType, sendBotMessage } from "../api/Commands";
import { Devs } from "../utils/constants";
import { PartialDeep } from "type-fest";
import { Message } from "discord-types/general";

interface Album {
    id: string
    image: {
        height: number
        width: number
        url: string
    }
    name: string
}

interface Artist {
    external_urls: {
        spotify: string
    }
    href: string
    id: string
    name: string
    type: "artist" | string
    uri: string
}

interface Track {
    id: string
    album: Album
    artists: Artist[]
    duration: number
    isLocal: boolean
    name: string
}

const messages = lazyWebpack(filters.byProps(["sendMessage"]));
const spotify = lazyWebpack(filters.byProps(["getPlayerState"]));

/**
 * Utility function to send a message. This is required due to how Discord handles built-in commands.
 * @param channelID The channel to send the message to
 * @param message The message to send
 */
const sendMessage = (channelID: string, message: PartialDeep<Message>) => {
    messages.sendMessage(channelID, {
        // The following are required to prevent Discord from throwing an error
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    });
};

export default definePlugin({
    name: "Sendify",
    description: "Send your current Spotify music to chat",
    authors: [Devs.katlyn],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "track",
            description: "Send your current Spotify track to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [],
            execute: (_, ctx) => {
                const track: Track | null = spotify.getTrack();
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
                const track: Track | null = spotify.getTrack();
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
                const track: Track | null = spotify.getTrack();
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
