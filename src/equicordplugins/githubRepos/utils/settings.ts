import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showStars: {
        type: OptionType.BOOLEAN,
        description: "Show repository stars",
        default: true
    },
    showLanguage: {
        type: OptionType.BOOLEAN,
        description: "Show repository language",
        default: true
    },
    showInMiniProfile: {
        type: OptionType.BOOLEAN,
        description: "Only show a button in the mini profile",
        default: true
    },
});
