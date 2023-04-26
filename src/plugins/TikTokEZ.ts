import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const re = /https?:\/\/www\.tiktok\.com(?=\/@\w+?\/video\/)/g;

export default definePlugin({
    name: "TikTokEZ",
    description: "Uses TikTokEZ to improve video embeds from TikTok on send",
    authors: [Devs.ThaUnknown],
    dependencies: ["MessageEventsAPI"],

    addPrefix(msg: MessageObject) {
        msg.content = msg.content.replace(re, "https://www.tiktokez.com");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addPrefix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
