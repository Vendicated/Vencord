import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MessageObject } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

export default definePlugin({
    name: "FixThis",
    description: "Fixes the url for embed in discord for several sites",
    authors: [Devs.Dawok],
    patches: [
        {
            find: "sendMessage",
            replacement: {
                match: /function \w+\((\w+)\)\{/,
                replace: "function $1($2){$2.content=this.modifyUrls($2.content);"
            }
        }
    ],

    modifyUrls(content: string): string {
        if (typeof content !== "string") return content;

        const urlMap: { [key: string]: string } = {
            "tiktok.com": "tnktok.com",
            "instagram.com": "ddinstagram.com",
            "twitter.com": "vxtwitter.com",
            "x.com": "vxtwitter.com",
            "pixiv.net": "phixiv.net",
            "reddit.com": "vxreddit.com",
            "clips.twitch.tv": "clips.fxtwitch.tv"
        };

    
        const processUrl = (url: string): string => {
            const lowerUrl = url.toLowerCase();
            
            if (lowerUrl.includes('twitter.com/i/spaces/') || lowerUrl.includes('x.com/i/spaces/')) {
                return url;
            }

            const twitchClipRegex = /https?:\/\/(www\.)?twitch\.tv\/[^\/]+\/clip\/([^\/\s]+)\/?/i;
            const twitchClipMatch = url.match(twitchClipRegex);
            if (twitchClipMatch) {
            // Remove trailing slash if present
            const clipId = twitchClipMatch[2];
            return `https://clips.fxtwitch.tv/${clipId}`;
            }

            const redditRegex = /https?:\/\/(old\.|new\.)?reddit\.com(.*)/i;
            const redditMatch = url.match(redditRegex);
            if (redditMatch) {
                return `https://vxreddit.com${redditMatch[2]}`;
            }

            for (const [oldDomain, newDomain] of Object.entries(urlMap)) {
                const regex = new RegExp(`https?://([a-zA-Z0-9-]+\\.)?${oldDomain.replace('.', '\\.')}`, 'i');
                if (regex.test(lowerUrl)) {
                    return url.replace(regex, (match, p1) => `https://${p1 || ''}${newDomain}`);
                }
            }

            return url;
        };

        const urlRegex = /https?:\/\/[^\s]+/gi;

        return content.replace(urlRegex, processUrl);
    },

    start() {
        const originalSendMessage = MessageActions.sendMessage;
        MessageActions.sendMessage = (channelId: string, message: MessageObject, ...args: any[]) => {
            if (typeof message.content === "string") {
                message.content = this.modifyUrls(message.content);
            }
            return originalSendMessage(channelId, message, ...args);
        };
    },

    stop() {
        if (MessageActions.sendMessage !== MessageActions.originalSendMessage) {
            MessageActions.sendMessage = MessageActions.originalSendMessage;
        }
    }
});
