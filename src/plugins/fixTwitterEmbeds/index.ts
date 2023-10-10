import {
    addPreEditListener,
    addPreSendListener,
    MessageObject,
    removePreEditListener,
    removePreSendListener
} from "@api/MessageEvents";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "Fix Twitter Embeds",
    description: "Fixes embeds using fxtwitter or vxtwitter",
    authors: [
        {
            id: 0n,
            name: "Cyrene",
        },
    ],

    settings: definePluginSettings({
        service: {
            description: "Which service would you like to use?",
            type: OptionType.SELECT,
            options: [
                {
                    label: "fxtwitter",
                    value: "fxtwitter.com",
                    default: true
                },
                {
                    label: "vxtwitter",
                    value: "vxtwitter.com",
                }
            ]
        }
    }),

    onSend(msg: MessageObject) {
        if (msg.content.match(/http(s)?:\/\/(twitter|x)\.com/)) {
            msg.content = msg.content.replace(
                /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
                match => this.replace(match)
            );
        }
    },

    replace(match: string) {
        try {
            var url = new URL(match);
        } catch (error) {
            return match;
        }

        url.hostname = this.settings.store.service;
        return url.toString();
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.onSend(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) =>
            this.onSend(msg)
        );
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
});
