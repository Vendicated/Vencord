

import definePlugin from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { enableStyle, disableStyle } from "@api/Styles";
import style from "./index.css?managed";

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
        enableStyle(style);
        console.log("mreowww blehhh i kill people");
        this.preSend = addPreSendListener((channelId, msg) => {
            console.log(msg.content);
        });
    },

    stop() {
        disableStyle(style);
        removePreSendListener(this.preSend);
    }
});