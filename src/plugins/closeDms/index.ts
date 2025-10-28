import definePlugin from "@utils/types";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { Devs } from "@utils/constants";

const PrivateChannelActions = findByPropsLazy("closePrivateChannel");
const PrivateChannelUtils = findByPropsLazy("openPrivateChannelConfirmModal");

function closePrivateChannel(channelId: string) {
    if (PrivateChannelActions?.closePrivateChannel) {
        PrivateChannelActions.closePrivateChannel(channelId);
    }
}

function leaveGroupDM(channelId: string) {
    if (PrivateChannelUtils?.openPrivateChannelConfirmModal) {
        PrivateChannelUtils.openPrivateChannelConfirmModal(channelId);
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

                const channelId = SelectedChannelStore.getChannelId();
                const channel = ChannelStore.getChannel(channelId);

                if (channel?.isDM()) {
                    closePrivateChannel(channelId);
                } else if (channel?.isGroupDM()) {
                    leaveGroupDM(channelId);
                }
            }
        };

        window.addEventListener("keydown", this.handleKey);
    },

    stop() {
        window.removeEventListener("keydown", this.handleKey);
    }
});
