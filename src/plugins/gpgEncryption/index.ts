import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";

const Native = VencordNative.pluginHelpers.GPGEncryption as PluginNative<
    typeof import("./native")
>;

export default definePlugin({
    name: "GPGEncryption",
    description:
        "Allows you to send GPG encrypted messages to other users with the plugin",
    authors: [Devs.zoeycodes],
    dependencies: ["MessageEventsAPI"],

    start() {
        try {
            this.preSend = addPreSendListener(async (channelId, msg) => {
                try {
                    const stdout = await Native.encryptMessage(msg.content);

                    msg.content = stdout;
                } catch (e) {
                    console.log("gpg error");
                }
                return false;
            });

            console.log("adding presend listener");
        } catch (e) {
            console.log(e);
        }
    },

    stop() {
        removePreSendListener(this.preSend);
    },
});
