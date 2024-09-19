/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findProp } from "@webpack";
import { ChannelStore, ContextMenuApi, i18n, UserStore } from "@webpack/common";
import { Message } from "discord-types/general";

const useMessageMenu = findProp("useMessageMenu");

function MessageMenu({ message, channel, onHeightUpdate }) {
    const canReport = message.author &&
        !(message.author.id === UserStore.getCurrentUser().id || message.author.system);

    return useMessageMenu({
        navId: "message-actions",
        ariaLabel: i18n.Messages.MESSAGE_UTILITIES_A11Y_LABEL,

        message,
        channel,
        canReport,
        onHeightUpdate,
        onClose: () => ContextMenuApi.closeContextMenu(),

        textSelection: "",
        favoriteableType: null,
        favoriteableId: null,
        favoriteableName: null,
        itemHref: void 0,
        itemSrc: void 0,
        itemSafeSrc: void 0,
        itemTextContent: void 0,
    });
}

migratePluginSettings("FullSearchContext", "SearchReply");
export default definePlugin({
    name: "FullSearchContext",
    description: "Makes the message context menu in message search results have all options you'd expect",
    authors: [Devs.Ven, Devs.Aria],

    patches: [{
        find: "onClick:this.handleMessageClick,",
        replacement: {
            match: /this(?=\.handleContextMenu\(\i,\i\))/,
            replace: "$self"
        }
    }],

    handleContextMenu(event: React.MouseEvent, message: Message) {
        const channel = ChannelStore.getChannel(message.channel_id);
        if (!channel) return;

        event.stopPropagation();

        ContextMenuApi.openContextMenu(event, contextMenuProps =>
            <MessageMenu
                message={message}
                channel={channel}
                onHeightUpdate={contextMenuProps.onHeightUpdate}
            />
        );
    }
});
