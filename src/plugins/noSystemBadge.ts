import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoSystemBadge",
    description: "Disables the taskbar and system tray unread count badge.",
    authors: [Devs.rushii],
    patches: [
        {
            find: "setSystemTrayApplications:function",
            replacement: [
                {
                    match: /setBadge:function\(\w{1,2}\){(?:{.*?}|[^{])*?}/,
                    replace: "setBadge:function(){}"
                },
                {
                    match: /setSystemTrayIcon:function\(\w{1,2}\){(?:{.*?}|[^{])*?}/,
                    replace: "setSystemTrayIcon:function(){}"
                }
            ]
        }
    ]
});
