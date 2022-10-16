import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoSystemBadge",
    description: "Disables the taskbar and system tray unread count badge.",
    authors: [Devs.rushii],
    target: "DESKTOP",
    patches: [
        {
            find: "setSystemTrayApplications:function",
            replacement: [
                {
                    match: /setBadge:function.+?},/,
                    replace: "setBadge:function(){},"
                },
                {
                    match: /setSystemTrayIcon:function.+?},/,
                    replace: "setSystemTrayIcon:function(){},"
                }
            ]
        }
    ]
});
