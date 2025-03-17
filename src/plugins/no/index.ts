import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";







export default definePlugin({
    name: "no",
    description: "no",
    authors: [Devs.Tally],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],

    start() {



        this.preSend = addMessagePreSendListener(async (_, message) => {
            if (!message.content) return;

            message.content = "no";
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    },
});

