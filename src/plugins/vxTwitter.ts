import definePlugin from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "VxTwitter",
    description: "Uses VxTwitter to fix embeds from twitter on send",
    authors: [Devs.Samu],
    dependencies: ["MessageEventsAPI"],

    addSuffix(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)(twitter\.com)(?=\/.*?\/)/g, "vxtwitter.com");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addSuffix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
