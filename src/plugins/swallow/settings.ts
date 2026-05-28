import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    webUrl: {
        type: OptionType.STRING,
        description: "URL du site Swallow (ex: https://swallow.fr)",
        default: "https://swallow.fr",
        placeholder: "https://swallow.fr",
    },
});
