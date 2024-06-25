import definePlugin from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, i18n, Menu, MessageStore, Parser, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

function pizzalleify(str: string): string {
    let result = str.toUpperCase();

    if (!result.endsWith(".")) {
        result += ".";
    }

    return result;
}

export default definePlugin({
    name: "Pizzalleify",
    description: "Makes all of your messages Pizzalle-like",
    authors: [{
        name: "doeimos.png",
        id: 1105436709669314600n
    }],

    start() {

        this.preSend = addPreSendListener((channelId, msg) => {
            msg.content = pizzalleify(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});