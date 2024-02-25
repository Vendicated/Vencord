import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";

let sound_click1, sound_click2, sound_click3, sound_clickBackspace;

export const settings = definePluginSettings({
    allowEscape: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Escape key",
        restartNeeded: false,
        default: true
    },
    allowTab: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Tab key",
        restartNeeded: false,
        default: true
    },
    allowCaps: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the CapsLock key",
        restartNeeded: false,
        default: true
    },
    allowShift: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Shift key",
        restartNeeded: false,
        default: true
    },
    allowCtrl: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Control key",
        restartNeeded: false,
        default: true
    },
    allowMeta: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Meta key",
        restartNeeded: false,
        default: false
    },
    allowAlt: {
        type: OptionType.BOOLEAN,
        description: "Play click when pressing the Alt key",
        restartNeeded: false,
        default: true
    },
});

export default definePlugin({
    name: "KeyboardClick",
    description: "Modified BD plugin for some nice clicking sounds when typing.",
    authors: [
        {
            id: 346059939502096396n,
            name: "Slluxx",
        },
    ],
    settings,
    patches: [],
    start() {
        sound_click1 = new Audio('https://dl.dropboxusercontent.com/s/vfxrfu2u8jiq6xw/click1.wav?raw=1');
        sound_click2 = new Audio('https://dl.dropboxusercontent.com/s/wtw25tzfctkpers/click2.wav?raw=1');
        sound_click3 = new Audio('https://dl.dropboxusercontent.com/s/kqjn62hwk035d2w/click3.wav?raw=1');
        sound_clickBackspace = new Audio('https://dl.dropboxusercontent.com/s/lluvdpgt8n8ohm0/backspace.wav?raw=1');
        // let enter = new Audio('https://dl.dropboxusercontent.com/s/lluvdpgt8n8ohm0/backspace.wav?raw=1');

        window.addEventListener("keydown", this.event);
    },
    stop() {
        window.removeEventListener("keydown", this.event);
    },
    event(e: KeyboardEvent) {

        if (e.key == "Escape" && !settings.store.allowEscape) return;
        if (e.key == "Tab" && !settings.store.allowTab) return;
        if (e.key == "CapsLock" && !settings.store.allowCaps) return;
        if (e.key == "Shift" && !settings.store.allowShift) return;
        if (e.key == "Control" && !settings.store.allowCtrl) return;
        if (e.key == "Meta" && !settings.store.allowMeta) return;
        if (e.key == "Alt" && !settings.store.allowAlt) return;

        if (e.key == "Backspace") {
            sound_clickBackspace.pause();
            sound_clickBackspace.currentTime = 0;
            sound_clickBackspace.play();
            return;
        }

        let availableAudios = [sound_click1, sound_click2, sound_click3].filter(audio => audio.ended || audio.paused);
        if (availableAudios.length == 0) return;

        const randomIndex = Math.floor(Math.random() * availableAudios.length);
        const randomAudio = availableAudios[randomIndex];

        randomAudio.pause();
        randomAudio.currentTime = 0;
        randomAudio.play();

    }
});
