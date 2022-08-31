import definePlugin from "../utils/types";
import gitHash from "git-hash";

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    author: "Vendicated",
    required: true,
    patches: [{
        find: "default.versionHash",
        replacement: [
            {
                match: /return .{1,2}\("div"/,
                replace: (m) => {
                    return `var versions=VencordNative.getVersions();${m}`;
                }
            },
            {
                match: /\w\.createElement.+?["']Host ["'].+?\):null/,
                replace: m => {
                    const idx = m.indexOf("Host") - 1;
                    const template = m.slice(0, idx);
                    return `${m}, ${template}"Vencord ", "${gitHash}"), " "), ` +
                        `${template} "Electron ", versions.electron), " "), ` +
                        `${template} "Chrome ", versions.chrome), " ")`;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            match: /\{section:(.{1,2})\.SectionTypes\.HEADER,\s*label:(.{1,2})\.default\.Messages\.ACTIVITY_SETTINGS\}/,
            replace: (m, mod) =>
                `{section:${mod}.SectionTypes.HEADER,label:"Vencord"},` +
                `{section:"Vencord",label:"Vencord",element:Vencord.Components.Settings},` +
                `{section:${mod}.SectionTypes.DIVIDER},${m}`

        }
    }]
});