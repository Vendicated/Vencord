import definePlugin from "../utils/types";
import { addPreSendListener, MessageObject, removePreSendListener } from "../api/MessageEvents";

export default definePlugin({
    name: "NoCanaryURL",
    description: "Removes the canary subdomain from urls",
    authors: [{ name: "ICodeInAssembly", id: 702973430449832038n }],
    dependencies: ["MessageEventsAPI"],
    removeCanary(msg: MessageObject) {
        msg.content = msg.content.replace(/(?<=https:\/\/)canary./, "");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.removeCanary(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
