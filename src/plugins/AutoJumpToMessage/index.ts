import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    onlyWhenUnfocused: {
        type: OptionType.BOOLEAN,
        default: true,
        description:
            "Only automatically jump to messages when Discord's window is unfocused.",
    },
});

export default definePlugin({
    name: "AutoJumpToMessage",
    description:
        "Automatically opens the channel from new messages. Muted channels are ignored. Made for those who keep Discord on another monitor.",
    tags: ["Chat", "Utility"],
    searchTerms: ["jump", "message", "auto", "notification", "focus", "unfocused"],
    authors: [Devs.k304, Devs.k304],
    settings,

    handleNotification(payload: any) {
        if (!payload) return;

        if (payload.type === "RPC_NOTIFICATION_CREATE") {
            // Dont do anything if discord is in focus
            if (settings.store.onlyWhenUnfocused && document.hasFocus()) {
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
