import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import rawMessages from "file://messages.txt";

const msg = rawMessages.split("\n").filter((v) => v !== "");
type KeyPressData = {
    date: number,
    isCapital: boolean,
};

let history: KeyPressData[] = [];
const keepFor = 250;
let intervalID: number;
let lastOutburst: number = 0;


const settings = definePluginSettings({
    keysmashCount: {
        description: "How many keys you have to press before it counts as a keysmash",
        default: 8,
        type: OptionType.NUMBER
    },
    cooldownSec: {
        description: "How many seconds you have to wait for an outburst to occur again (must be at least 5 seconds! this plugin will not work otherwise!)",
        default: 10,
        type: OptionType.NUMBER,
    },
    extraMessages: {
        description: "List of extra messages the plugin can use when you inevitably crash out (pipe delimited, text | more text)",
        type: OptionType.STRING,
        default: "",
    },
    angryMessages: {
        description: "Above option, but for angry messages. Must not be empty if the Angrier When Capital option is enabled",
        type: OptionType.STRING,
        default: "",
    },
    angrierWhenCapital: {
        description: "If the majority of your message is capital, angrier messages are output.",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

export default definePlugin({
    name: "ExpressiveKeysmash",
    description: "ASDFGHJKL not working? Be comprehensible with your keysmashes by sending random messages every time you... keysmash!",
    authors: [Devs.oky],
    tags: [
        "Fun"
    ],

    settings,

    outburst() {
        if (settings.store.cooldownSec < 5 || Date.now() - settings.store.cooldownSec * 1000 < lastOutburst)
            return;
        lastOutburst = Date.now();
        const keysCapital = history.reduce<number>((c, v) => {
            return c + (v.isCapital ? 1 : 0);
        }, 0);
        let angry = false;
        if (keysCapital > history.length - keysCapital && settings.store.angrierWhenCapital && settings.store.angryMessages.trim() !== "") {
            angry = true;
        }

        const arr = (!angry ? msg.concat(settings.store.extraMessages.split("|")) : settings.store.angryMessages.split("|"));
        const message = arr[Math.floor(Math.random() * arr.length)];

        const channelId = getCurrentChannel()?.id;
        if (channelId) {
            sendMessage(channelId, {
                content: message
            });
        }
    },

    start() {
        this.keyDownHandler = (e: KeyboardEvent) => {
            const now = Date.now();
            history.push({
                date: now,
                isCapital: e.getModifierState('CapsLock') || e.getModifierState('Shift')
            });

            if (history.length >= settings.store.keysmashCount) {
                this.outburst();
            }
        };

        window.document.addEventListener("keydown", this.keyDownHandler);

        intervalID = setInterval((e) => {
            history = history.filter((val) => Date.now() < val.date + keepFor);
        }, 100);
    },

    stop() {
        // clear
        history = [];
        if (intervalID)
            clearInterval(intervalID);
        if (this.keyDownHandler)
            window.document.removeEventListener("keydown", this.keyDownHandler);
    }
});
