import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    onlyWhenOutOfFocus: {
        type: OptionType.BOOLEAN,
        default: true,
        description:
            "Only automatically jump to messages when Discord's window is out of focus.",
    },
});

export default definePlugin({
    name: "AutoJumpToMessage",
    description:
        "Automatically opens the channel from new messages. Muted channels are ignored. Made for those who keep Discord on another monitor.",
    tags: ["Chat", "Utility"],
    searchTerms: ["jump", "message", "auto", "notification", "focus"],
    authors: [Devs.k304, Devs.k304],
    settings,

    handleNotification(payload: any) {
        if (!payload) return;

        if (payload.type === "RPC_NOTIFICATION_CREATE") {
            // Dont do anything if discord is in focus
            if (settings.store.onlyWhenOutOfFocus && document.hasFocus()) {
                return;
            }

            const channelId = payload.channelId;

            if (channelId) {
                ChannelRouter.transitionToChannel(channelId);
            }
        }
    },

    start() {
        FluxDispatcher.subscribe(
            "RPC_NOTIFICATION_CREATE",
            this.handleNotification,
        );
        console.log("AutoJumpToMessage plugin is UP!.");
    },

    stop() {
        FluxDispatcher.unsubscribe(
            "RPC_NOTIFICATION_CREATE",
            this.handleNotification,
        );
        console.log("AutoJumpToMessage plugin stoped.");
    },
});
