import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { Toasts } from '../webpack/common';

export default definePlugin({
    name: "ClickableRoleDot",
    authors: [Devs.Ven],
    description:
        "Makes RoleDots (Accessibility Feature) copy colour to clipboard on click",
    patches: [
        {
            find: "M0 4C0 1.79086 1.79086 0 4 0H16C18.2091 0 20 1.79086 20 4V16C20 18.2091 18.2091 20 16 20H4C1.79086 20 0 18.2091 0 16V4Z",
            replacement: {
                match: /(viewBox:"0 0 20 20")/,
                replace: "$1,onClick:()=>Vencord.Plugins.plugins.ClickableRoleDot.copyToClipBoard(e.color)",
            },
        },
    ],

    copyToClipBoard(color: string) {
        window.DiscordNative.clipboard.copy(color);
        Toasts.show({
            message: "Copied to Clipboard!",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 1000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
});
