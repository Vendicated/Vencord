

import definePlugin from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, i18n, Menu, MessageStore, Parser, Timestamp, UserStore, useStateFromStores } from "@webpack/common";
import { enableStyle, disableStyle } from "@api/Styles";

function doaflip() {
    document.getElementById('app-wrapper')!.style.animation = "thing 1s linear";
}

export default definePlugin({
    name: "Do A Flip!",
    description: "do a flip pls",
    authors: [{
        name: "doeimos.png",
        id: 1105436709669314600n,
    }],

    patches: [],

    start() {
        console.log("mreowww blehhh i kill people");
        this.preSend = addPreSendListener((channelId, msg) => {
            if (msg.content.toLowerCase() == 'do a flip') {
                doaflip();
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});