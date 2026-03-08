import { patcher, webpack } from "@vendicated/patch";
import { definePlugin } from "@utils/types";
import { Devs } from "@utils/constants";

const MessageActions = webpack.getByProps("sendMessage", "editMessage");

export default definePlugin({
    name: "MessageModifier",
    description: "Modifies outgoing messages with custom suffixes.",
    authors: [Devs.ikito],

    onStart() {
        if (!MessageActions) {
            console.error("MessageModifier: Failed to find MessageActions module");
            return;
        }

        this.patch = patcher.before(MessageActions, "sendMessage", (args) => {
            const message = args[1];
            if (message && typeof message.content === "string") {
                message.content += " (sent via Vencord)";
            }
        });
    },

    onStop() {
        this.patch?.();
    }
});
