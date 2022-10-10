import definePlugin from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "FxTwitter",
    description: "Uses FxTwitter to fix embeds from twitter on send",
    authors: [Devs.Samu],
    dependencies: ["MessageEventsAPI"],

    addPrefix(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)(twitter\.com)(?=\/.*?\/)/g, "fxtwitter.com");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.addSuffix(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
