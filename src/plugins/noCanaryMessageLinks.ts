import definePlugin from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";

export default definePlugin({
    name: "NoCanaryMessageLinks",
    description: "Removes the canary and ptb prefix from message links",
    authors: [{ name: "ICodeInAssembly", id: 702973430449832038n }],
    dependencies: ["MessageEventsAPI"],

    removeBetas(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)(canary.|ptb.)(?=discord(?:app)?.com\/channels\/(?:\d{17,20}|@me)\/\d{17,20}\/\d{17,20})/g, ""); // Ven W
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.removeBetas(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
