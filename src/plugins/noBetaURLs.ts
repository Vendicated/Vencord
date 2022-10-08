import definePlugin from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";

export default definePlugin({
    name: "NoBetaURLs",
    description: "Removes the canary and ptb subdomains from urls",
    authors: [{ name: "ICodeInAssembly", id: 702973430449832038n }],
    dependencies: ["MessageEventsAPI"],
    removeBetas(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)(canary.|ptb.)((?=discord.[a-z]{1,3}\/channels\/)|(?=discordapp.[a-z]{1,3}\/channels\/))/g, "");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.removeBetas(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
