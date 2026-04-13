import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { Devs } from "@utils/constants";

/**
 * Formats Discord channel names:
 * ingame-chat → Ingame Chat
 * Version 2.0.0 
 */

function format(name: string) {
    if (!name) return name;

    return name
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\band\b/gi, "&")
        .replace(/\b\w/g, c => c.toUpperCase());
}

export default definePlugin({
    name: "Clean Channel Names",
    description: "Formats Channel names into readable text (removes dashes/underscores + adds uppercase lettering).",
    authors: [Devs.Gh0sTyNZ],

    start() {
        const orig = ChannelStore.getChannel;

        ChannelStore.getChannel = function (channelId: string) {
            const channel = orig.call(this, channelId);

            if (channel?.name) {
                channel.name = format(channel.name);
            }

            return channel;
        };
    },

    stop() {}
});