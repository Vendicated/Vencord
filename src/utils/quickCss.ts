import { addSettingsListener, Settings } from "../api/settings";
import IpcEvents from "./IpcEvents";

let style: HTMLStyleElement;

export async function toggle(isEnabled: boolean) {
    if (!style) {
        if (isEnabled) {
            style = document.createElement("style");
            style.id = "bencord-custom-css";
            document.head.appendChild(style);
            BencordNative.ipc.on(IpcEvents.QUICK_CSS_UPDATE, (_, css: string) => style.innerText = css);
            style.innerText = await BencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
        }
    } else // @ts-ignore yes typescript, property 'disabled' does exist on type 'HTMLStyleElement' u should try reading the docs some time
        style.disabled = !isEnabled;
}

document.addEventListener("DOMContentLoaded", () => {
    toggle(Settings.useQuickCss);
    addSettingsListener("useQuickCss", toggle);
});
