import definePlugin from "../utils/types";
import gitHash from "git-hash";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven],
    required: true,
    patches: [{
        find: "().versionHash",
        replacement: [
            {
                match: /\w\.createElement\(.{1,2}.Fragment,.{0,30}\{[^}]+\},"Host ".+?\):null/,
                replace: m => {
                    const idx = m.indexOf("Host") - 1;
                    const template = m.slice(0, idx);
                    let r = `${m}, ${template}"Vencord ", "${gitHash}${IS_WEB ? " (Web)" : ""}"), " ")`;
                    if (!IS_WEB) {
                        r += `,${template} "Electron ",VencordNative.getVersions().electron)," "),`;
                        r += `${template} "Chrome ",VencordNative.getVersions().chrome)," ")`;
                    }
                    return r;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            match: /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.ACTIVITY_SETTINGS\}/,
            replace: (m, mod) =>
                `{section:${mod}.ID.HEADER,label:"Vencord"},` +
                '{section:"VencordSetting",label:"Vencord",element:Vencord.Components.Settings},' +
                '{section:"VencordUpdater",label:"Updater",element:Vencord.Components.Updater,predicate:()=>!IS_WEB},' +
                `{section:${mod}.ID.DIVIDER},${m}`

        }
    }]
});
