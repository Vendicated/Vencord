import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import definePlugin from "@utils/types";

const twitterRegex = /http(?:s)?:\/\/(?:www\.)?twitter\.com/g;
const vxTwitterUrl = "https://vxtwitter.com";

function replaceUrl(content: string): string {
    if (content.length === 0) return content;
    content = content.replaceAll(twitterRegex, vxTwitterUrl);
    return content;
}

export default definePlugin({
    name: "Twitter Embed Fix",
    description: "Renames twitter.com URLs to vxtwitter.com for friendly embed",
    authors: [{ id: 693308496011067423n, name: "Feroci" }],
    dependencies: ["MessageEventsAPI"],

    async start() {
        this.preSend = addPreSendListener((channelId, msg) => {
            msg.content = replaceUrl(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});