import definePlugin from "@utils/types";
import { openCommandPalette } from "./components/CommandPalette";
import { closeAllModals } from "@utils/modal";
import { SettingsRouter } from "@webpack/common";
import { registerAction } from "./commands";
import { Devs } from "@utils/constants";


export default definePlugin({
    name: "CommandPalette",
    description: "Allows you to navigate the UI with a keyboard.",
    authors: [Devs.Ethan],

    start() {
        document.addEventListener("keydown", this.event);

        if (IS_DEV) {
            registerAction({
                id: 'openDevSettings',
                label: 'Open Dev tab',
                callback: () => SettingsRouter.open("VencordPatchHelper")
            });
        }
    },

    stop() {
        document.removeEventListener("keydown", this.event);
    },

    event(e: KeyboardEvent) {
        const { ctrlKey, shiftKey, key } = e;

        if (!ctrlKey || !shiftKey || key !== "P") return;

        closeAllModals();

        if (document.querySelector(".vc-command-palette-root")) { // Allows for a toggle
            return;
        }

        openCommandPalette();
    }
});
