

import definePlugin from "@utils/types";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { enableStyle, disableStyle } from "@api/Styles";
import style from "./index.css?managed";


function myEndFunction() {
    document.getElementById('app-mount')!.style.animation = '';
}

function doaflip() {
    document.getElementById('app-mount')!.style.animationPlayState = "initial";
    document.getElementById('app-mount')!.style.animation = "thing 1s linear";
    document.getElementById('app-mount')!.addEventListener("animationend", myEndFunction);
}

export default definePlugin({
    name: "Do A Flip!",
    description: "do a flip pls",
    authors: [{
        name: "doeimos.png",
        id: 1105436709669314600n,
    }],

    dependencies: ["MessageEventsAPI"],

    async start() {
        enableStyle(style);
        console.log("mreowww blehhh i kill people");
        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (msg.content.toLowerCase() == 'do a flip') {
                doaflip();
            }
        });
    },

    stop() {
        disableStyle(style);
        removePreSendListener(this.preSend);
    }
});