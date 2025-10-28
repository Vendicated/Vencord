import definePlugin from "@utils/types";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { Devs } from "@utils/constants";

const PrivateChannelActions = findByPropsLazy("closePrivateChannel");

function closePrivateChannel(channelId: string) {
    if (PrivateChannelActions?.closePrivateChannel) {
        PrivateChannelActions.closePrivateChannel(channelId);
    }
}

export default definePlugin({
    name: "CloseDMsWithCtrlW",
    description: "Closes the current DM when pressing Ctrl + W",
    authors: [Devs.IamSwan],

    start() {
        this.handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "w") {
                e.preventDefault();

                console.log("Control + W detected");

                const channelId = SelectedChannelStore.getChannelId();
                const channel = ChannelStore.getChannel(channelId);

                if (channel?.isDM()) {
                    closePrivateChannel(channelId);
                    console.log(`[closeWithCtrlW] Closed DM ${channelId}`);
                }
            }
        };

        window.addEventListener("keydown", this.handleKey);
    },

    stop() {
        window.removeEventListener("keydown", this.handleKey);
    }
});
