/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";
import { FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";

const HideIcon = () => {
    return <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-labelledby="eyeCrossedIconTitle" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="currentColor">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
        <path d="M22 12C22 12 19 18 12 18C5 18 2 12 2 12C2 12 5 6 12 6C19 6 22 12 22 12Z"></path><circle cx="12" cy="12" r="3"></circle><path d="M3 21L20 4"></path></g>
    </svg>;
};

export default definePlugin({
    name: "HideMessage",
    description: "Adds an option to hide messages",
    authors: [Devs.Isaac],
    
    renderMessagePopoverButton(msg) {
        return {
            label: "Hide Message",
            icon: HideIcon,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => this.hideMessage(msg)
        };
    },

    hideMessage(msg: Message) {
        FluxDispatcher.dispatch({type: "MESSAGE_DELETE", channelId: msg.channel_id, id: msg.id});
    },
});
