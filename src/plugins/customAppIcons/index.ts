import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { Devs } from "@utils/constants";

const settings = definePluginSettings({
    icons: {
        description: "Icons to add; \n Example: `Shiggy: https://cdn.discordapp.com/emojis/1155918238442606713.gif?size=4096`",
        type: OptionType.STRING,
        restartNeeded: true,
        multiline: true,
        stickToMarkers: true,
    }
});

type Icon = {
    id: string,
    iconSource: string,
    isPremium: boolean,
    name: string,
};


function getCustomIcons() {
    var icons: Icon[] = [];
    const settingsIcons = settings.store.icons?.split("\n") as string[];
    settingsIcons.forEach(icon => {
        const matched = /([^:]+):\s*(.+)/.exec(icon);

        if (!matched || !matched[1] || !matched[2]) return;
        const name = matched[1].trim();

        const idName = name
            .toLowerCase()
            .replace(/\s/g, "_")
            .replace(/\W/g, "#");

        icons.push({
            id: `CustomAppIcon-${idName}`,
            iconSource: matched[2].trim(),
            isPremium: false,
            name: matched[1].trim()
        });
    });

    const outIcons = icons.map((i) => JSON.stringify(i)).join(",");

    return JSON.stringify([...outIcons]);
}

export default definePlugin({
    name: "CustomAppicons",
    description: "Allows you to add your own app icon to the list.",
    settings,
    authors: [Devs.nakoyasha, Devs.simplydata],
    patches: [
        {
            find: "APP_ICON_HOLO_WAVES}",
            replacement: {
                match: /\[({[^]*?})\]/,
                replace: getCustomIcons,
            }
        }
    ],
});
