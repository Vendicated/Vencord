import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { Devs } from "@utils/constants";

let originalGetChannel: typeof ChannelStore.getChannel | null = null;

function format(name: string) {
    if (!name) return name;

    return name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

export default definePlugin({
    name: "ChannelNameFormatter",
    description: "Formats channel names into readable text by removing dashes and underscores and applying capitalization.",
    authors: [Devs.Gh0sTyNZ],

    start() {
        if (originalGetChannel) return;
        originalGetChannel = ChannelStore.getChannel;

        ChannelStore.getChannel = function (channelId: string) {
            const channel = originalGetChannel!.call(this, channelId);

            if (channel?.name) {
                channel.name = format(channel.name);
            }

            return channel;
        };
    },

    stop() {
        if (originalGetChannel) {
            ChannelStore.getChannel = originalGetChannel;
            originalGetChannel = null;
        }
    }
});
