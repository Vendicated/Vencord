import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MessageObject } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage");

export default definePlugin({
    name: "URL Domain Changer",
    description: "Changes domains for TikTok, Instagram, Twitter, and X links",
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
            "vm.tiktok.com": "vm.tnktok.com",
            "tiktok.com": "tnktok.com",
            "instagram.com": "www.ddinstagram.com",
            "twitter.com": "vxtwitter.com",
            "x.com": "vxtwitter.com"
        };

        const processUrl = (url: string): string => {
            const lowerUrl = url.toLowerCase();
            
            if (lowerUrl.includes('twitter.com/i/spaces/') || lowerUrl.includes('x.com/i/spaces/')) {
                return url;
            }

            for (const [oldDomain, newDomain] of Object.entries(urlMap)) {
                const regex = new RegExp(`https?://(www\\.)?${oldDomain.replace('.', '\\.')}`, 'i');
                if (regex.test(lowerUrl)) {
                    return url.replace(regex, `https://${newDomain}`);
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
