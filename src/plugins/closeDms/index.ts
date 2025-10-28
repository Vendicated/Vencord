import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";

const PrivateChannelActions = findByPropsLazy("closePrivateChannel");

const settings = definePluginSettings({
    confirmGroupDMLeave: {
        type: OptionType.BOOLEAN,
        description: "Show confirmation dialog before leaving group DMs",
        default: true
    }
});

export default definePlugin({
    name: "CloseDMsWithCtrlW",
    description: "Closes the current DM when pressing Ctrl + W",
    authors: [Devs.IamSwan],
    settings,

    start() {
        this.handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "w") {
                e.preventDefault();

                const channelId = SelectedChannelStore.getChannelId();
                const channel = ChannelStore.getChannel(channelId);

                if (channel?.isDM())
                    PrivateChannelActions.closePrivateChannel(channelId);

                if (channel?.isGroupDM()) {
                    if (settings.store.confirmGroupDMLeave) {
                        const groupName = channel.name || "this group";

                        Alerts.show({
                            title: "Leave Group",
                            body: `Are you sure you want to leave ${groupName}? You won't be able to rejoin unless you are re-invited.`,
                            confirmText: "Leave Group",
                            cancelText: "Cancel",
                            onConfirm: () => {
                                PrivateChannelActions.closePrivateChannel(channelId);
                            }
                        });
                    } else {
                        PrivateChannelActions.closePrivateChannel(channelId);
                    }
                }
            }
        };

        window.addEventListener("keydown", this.handleKey);
    },

    stop() {
        window.removeEventListener("keydown", this.handleKey);
    }
});
