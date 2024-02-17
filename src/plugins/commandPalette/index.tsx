import definePlugin, { OptionType } from "@utils/types";
import { openCommandPalette } from "./components/CommandPalette";
import { closeAllModals } from "@utils/modal";
import { Button, SettingsRouter, useState } from "@webpack/common";
import { registerAction } from "./commands";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";

const cl = classNameFactory("vc-command-palette-");
let isRecordingGlobal: boolean = false;

export const settings = definePluginSettings({
    hotkey: {
        description: "The hotkey to open the command palette.",
        type: OptionType.COMPONENT,
        default: ["Control", "Shift", "P"],
        component: () => {
            const [isRecording, setIsRecording] = useState(false);

            const recordKeybind = (setIsRecording: (value: boolean) => void) => {
                let keys: Set<string> = new Set();
                let keyLists: string[][] = [];

                setIsRecording(true);
                isRecordingGlobal = true;

                const updateKeys = () => {
                    if (keys.size === 0 || !document.querySelector(`.${cl("key-recorder-button")}`)) {
                        const longestArray = keyLists.reduce((a, b) => a.length > b.length ? a : b);
                        if (longestArray.length > 0) {
                            settings.store.hotkey = longestArray.map((key) => key.toLowerCase());
                        }
                        setIsRecording(false);
                        isRecordingGlobal = false;
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
            };

            return (
                <>
                    <div className={cl("key-recorder-container")} onClick={() => recordKeybind(setIsRecording)}>
                        <div className={`${cl("key-recorder")} ${isRecording ? cl("recording") : ""}`}>
                            {settings.store.hotkey.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" + ")}
                            <button className={`${cl("key-recorder-button")} ${isRecording ? cl("recording-button") : ""}`} disabled={isRecording}>
                                {isRecording ? "Recording..." : "Record keybind"}
                            </button>
                        </div>
                    </div>
                </>
            );
        }
    },
    allowMouseControl: {
        description: "Allow the mouse to control the command palette.",
        type: OptionType.BOOLEAN,
        default: true
    }
});


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

        if (isRecordingGlobal) return;

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
