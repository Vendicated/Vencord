import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    client: {
        type: OptionType.SELECT,
        description: "Show the client as:",
        restartNeeded: true,
        options: [
            {
                label: "Discord Desktop",
                value: "Discord Client",
                default: IS_DISCORD_DESKTOP
            },
            {
                label: "Discord Web",
                value: "Chrome",
                default: IS_WEB || IS_VESKTOP
            },
            {
                label: "Discord Mobile",
                value: "Discord Android"
            }
        ]
    }
});

export default definePlugin({
    name: "ClientSpoofer",
    description: "Make discord think you're using a different client.",
    authors: [Devs.ImLvna],

    settings,

    patches: [
        {
            find: "[IDENTIFY]",
            replacement: {
                match: /(?<=properties:)(\i)(?=,)/,
                replace: "$self.patchProps($1)"
            }
        }
    ],

    patchProps(props: any) {
        props.browser = settings.store.client;
        return props;
    }
});