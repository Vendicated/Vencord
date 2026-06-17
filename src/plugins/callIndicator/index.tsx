import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { CallStore } from "@webpack/common/stores";

const settings = definePluginSettings({
    indicatorColor: {
        type: OptionType.STRING,
        description: "Indicator color",
        default: "#45a366"
    }
});

export default definePlugin({
    name: "CallIndicator",

    description: "Shows indicator on DMs with active calls",

    authors: [
        {
            name: "commandblocks0",
            id: 0n
        }
    ],

    settings,

    patches: [
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /#{intl::CLOSE_DM}.+?}\)(?=])/,
                replace: "$&,$self.renderIndicator(arguments[0])"
            }
        }
    ],

    renderIndicator(props: any) {

        const channel = props?.channel;

        if (!channel)
            return null;

        if (!CallStore.isCallActive(channel.id))
            return null;

        return (
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 4,
                    height: "100%",
                    background: settings.store.indicatorColor,
                    borderRadius: "0 4px 4px 0",
                    pointerEvents: "none"
                }}
            />
        );
    }
});