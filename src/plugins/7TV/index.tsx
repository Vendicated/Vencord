import definePlugin, { OptionType } from "@utils/types";
import { Logger } from "@utils/Logger";
import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";

/**
 * Plugin settings for SevenTVEmotes.
 */
const settings = definePluginSettings({
    twitchID: {
        type: OptionType.NUMBER,
        description: "Enter the TwitchID for their active EmoteSet",
        default: 760164944,
    },
});

export default definePlugin({
    name: "7TV",
    description: "Adds SevenTV emotes to Discord chat",
    authors: [Devs.prodbyeagle],
    settings,
    messageListener: ((_, msg) => {
        msg.content = replaceEmotes(msg.content);
    }) as MessageSendListener,

    start() {
        logger.info("Starting SevenTVEmotes plugin");
        fetchEmoteSet();
        addMessagePreSendListener(this.messageListener);
    },

    stop() {
        logger.info("Stopping SevenTVEmotes plugin");
        removeMessagePreSendListener(this.messageListener);
    },
});

const logger = new Logger("SevenTVEmotes", "#e11d48");
const emoteCache = new Map<string, string>();

/**
 * Fetches the emote set for the configured Twitch ID and caches the emote URLs.
 * Fetches the emote set from the 7TV API and stores it in a Map for quick lookup.
 */
const fetchEmoteSet = async () => {
    const TWITCH_USER_ID = settings.store.twitchID;
    const API_URL = `https://7tv.io/v3/users/twitch/${TWITCH_USER_ID}`;

    try {
        logger.info("Fetching emote set from 7TV API");
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (data.emote_set?.emotes) {
            emoteCache.clear();
            for (const emote of data.emote_set.emotes) {
                const url = `https:${emote.data.host.url}/1x.webp`;
                emoteCache.set(emote.name, url);
            }
            logger.info("Emote set fetched successfully", `Total emotes: ${emoteCache.size}`);
        } else {
            logger.warn("No emotes found in the fetched emote set");
        }
    } catch (error) {
        logger.error("Failed to fetch 7TV emote set:", error);
    }
};

/**
 * Replaces emote names in a message with their corresponding images.
 *
 * @param text - The message content to be processed.
 * @returns The modified message with emotes replaced by image URLs.
 */
function replaceEmotes(text: string): string {
    logger.debug("Replacing emotes in text:", text);

    const result = text.replace(/([a-zA-Z0-9!?]+|:\d?3:)/g, (match) => {
        const url = emoteCache.get(match);
        return url ? `[${match}](${url})` : match;
    });

    logger.debug("Text after emote replacement:", result);
    return result;
}
