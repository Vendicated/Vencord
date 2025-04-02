import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";
import Patches from "./patches";
import { definePluginSettings } from "@api/Settings";
import { Forms } from "@webpack/common";
import { Link } from "@components/Link";

export const ParsedPatches = Object.entries(Patches).map(([patchName, { description, default: defaultValue, patches }]) => {
    return {
        name: patchName,
        setting: {
            type: OptionType.BOOLEAN,
            description,
            default: !!(defaultValue ?? true),
            restartNeeded: true
        } as PluginSettingDef,
        patches: (Array.isArray(patches) ? patches : [patches]).map(p => ({
            ...p,
            predicate: () => ((p?.predicate ?? (() => true))() && settings.store[patchName]) || settings.store.enableAllPatches
        })),
    };
});

const settings = definePluginSettings(Object.fromEntries([
    ...ParsedPatches.map(p => [p.name, p.setting]),
    ["enableAllPatches", {
        type: OptionType.BOOLEAN,
        description: "Enable all patches (intended for testing)",
        default: false,
        restartNeeded: true
    }]
]));

export default definePlugin({
    name: "JunkCleanup",
    description: "Another plugin that cleans up common annoyances in Discord",
    authors: [Devs.Sqaaakoi],
    settings,
    patches: ParsedPatches.flatMap(p => p.patches),
    tags: ["junk", "bloat", "debloat", "shop", "gift", "nitro", "ad", "advertisement", "adblock"],
    settingsAboutComponent: () => {
        return <div>
            <Forms.FormTitle>Total patch count: {ParsedPatches.length}</Forms.FormTitle>
            <Forms.FormTitle style={{ marginBottom: 0 }}><Link href="https://github.com/Sqaaakoi/vc-junkCleanup">View repository on GitHub</Link></Forms.FormTitle>
        </div>;
    }
});
