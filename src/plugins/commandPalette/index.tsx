import definePlugin, { OptionType } from "@utils/types";
import { openCommandPalette } from "./components/CommandPalette";
import { closeAllModals } from "@utils/modal";
import { Button, SettingsRouter } from "@webpack/common";
import { registerAction } from "./commands";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";

const cl = classNameFactory("vc-command-palette-");
let recording: boolean = false;

export const settings = definePluginSettings({
    hotkey: {
        description: "The hotkey to open the command palette.",
        type: OptionType.COMPONENT,
        default: ["Control", "Shift", "P"],
        component: () => (
            <>
                <div className={cl("key-recorder-container")} onClick={recordKeybind}>
                    <div className={cl("key-recorder", { "vc-command-palette-recording": recording })}>
                        {settings.store.hotkey.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" + ")}
                        <button className={cl("key-recorder-button", { "vc-command-palette-recording-button": recording })} disabled={recording}>
                            {recording ? "Recording..." : "Record keybind"}
                        </button>
                    </div>
                </div>
            </>
        )
    },
    allowMouseControl: {
        description: "Allow the mouse to control the command palette.",
        type: OptionType.BOOLEAN,
        default: true
    }
});

function recordKeybind() {
    let keys: Set<string> = new Set();
    let keyLists: string[][] = [];

    const updateComponentText = () => {
        const button = document.querySelector(`.${cl("key-recorder-button")}`);
        const div = document.querySelector(`.${cl("key-recorder")}`);

        if (button) {
            button.textContent = recording ? "Recording..." : "Record keybind";
            button.classList.toggle(cl("recording-button"), recording);
        }

        if (div) {
            div.classList.toggle(cl("recording"), recording);
        }
    };

    recording = true;
    updateComponentText();

    const updateKeys = () => {


        if (keys.size === 0 || !document.querySelector(`.${cl("key-recorder-button")}`)) {
            const longestArray = keyLists.reduce((a, b) => a.length > b.length ? a : b);

            if (longestArray.length > 0) {
                settings.store.hotkey = longestArray.map((key) => key.toLowerCase());
            }

            recording = false;
            updateComponentText();

            document.removeEventListener("keydown", keydownListener);
            document.removeEventListener("keyup", keyupListener);
        }

        keyLists.push(Array.from(keys));
    };

    const keydownListener = (e: KeyboardEvent) => {
        const { key } = e;

        if (!keys.has(key)) {
            keys.add(key);
        }

        updateKeys();
    };

    const keyupListener = (e: KeyboardEvent) => {
        keys.delete(e.key);
        updateKeys();
    };

    document.addEventListener("keydown", keydownListener);
    document.addEventListener("keyup", keyupListener);
}


export default definePlugin({
    name: "CommandPalette",
    description: "Allows you to navigate the UI with a keyboard.",
    authors: [Devs.Ethan],
    settings,

    start() {
        document.addEventListener("keydown", this.event);

        if (IS_DEV) {
            registerAction({
                id: 'openDevSettings',
                label: 'Open Dev tab',
                callback: () => SettingsRouter.open("VencordPatchHelper"),
                registrar: "Vencord"
            });
        }
    },

    stop() {
        document.removeEventListener("keydown", this.event);
    },


    event(e: KeyboardEvent) {

        enum Modifiers {
            control = "ctrlKey",
            shift = "shiftKey",
            alt = "altKey",
            meta = "metaKey"
        }

        const { hotkey } = settings.store;
        const pressedKey = e.key.toLowerCase();

        if (recording) return;

        for (let i = 0; i < hotkey.length; i++) {
            const lowercasedRequiredKey = hotkey[i].toLowerCase();

            if (lowercasedRequiredKey in Modifiers && !e[Modifiers[lowercasedRequiredKey]]) {
                return;
            }

            if (!(lowercasedRequiredKey in Modifiers) && pressedKey !== lowercasedRequiredKey) {
                return;
            }
        }

        closeAllModals();

        if (document.querySelector(`.${cl("root")}`)) return;

        openCommandPalette();
    }
});
