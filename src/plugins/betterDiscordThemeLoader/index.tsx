import definePlugin from "@utils/types";
import "./BetterDiscordThemesTab";
import BetterDiscordThemesTab from "./BetterDiscordThemesTab";

export default definePlugin({
    name: "BetterDiscord Theme Loader",
    description: "This plugin allows you to change themes from BetterDiscord with one click",
    enabledByDefault: true, // Because the plugin only changes the settings
    authors: [
        {
            id: 272683334755418113n,
            name: "CREAsTIVE",
        },
    ],

    patches: [{
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            match: /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.ACTIVITY_SETTINGS\}/,
            replace: "...$self.makeSettingsCategories($1),$&"
        }
    }],
    customSections: [] as ((ID: Record<string, unknown>) => any)[],
    makeSettingsCategories({ ID }: { ID: Record<string, unknown>; }) {
        return [
            {
                section: "BetterDiscordThemes",
                label: "BetterDiscord Themes",
                element: BetterDiscordThemesTab,
                className: "better_discord_themes-settings"
            },
            ...this.customSections.map(func => func(ID)),
            {
                section: ID.DIVIDER
            }
        ].filter(Boolean);
    },
    // Delete these two below if you are only using code patches
    start() {

    },

    stop() { },
});
