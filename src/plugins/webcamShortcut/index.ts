import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { wreq } from "@webpack";

let originalA: any;
let mod442353: any;

export default definePlugin({
    name: "FixWebcamShortcut",
    description: "Fix to a possible bug: the webcam shortcut in Discord always opens the preview modal, ignoring the 'Don't show this again' setting. This plugin overrides the relevant function to respect the user's preference.",
    authors: [Devs.marga],

    // When using the webcam shortcut in Discord, module 87203 calls the camera toggle function with a 
    // hardcoded third argument true that always forces the preview modal to open — completely ignoring 
    // the "Don't show this again" setting. The plugin overrides that function by removing the forced flag, 
    // so the shortcut respects the user's preference exactly like the manual button click does.
    // This is most likely a bug in Discord, this plugin serves as a workaround until Discord hopefully fixes it, i've already opened an issue!.

    start() {
        mod442353 = wreq("442353" as any);
        originalA = mod442353?.A;

        if (!originalA) {
            console.error("[FixWebcamShortcut] Module 442353 not found!");
            return;
        }

        Object.defineProperty(mod442353, "A", {
            configurable: true,
            writable: true,
            value: function (onEnable: any, context: any) {
                return originalA(onEnable, context, false);
            }
        });

        console.log("[FixWebcamShortcut] Patch applied!");
    },

    stop() {
        if (mod442353 && originalA) {
            Object.defineProperty(mod442353, "A", {
                configurable: true,
                writable: true,
                value: originalA
            });
        }
        console.log("[FixWebcamShortcut] Plugin stopped!");
    }
});