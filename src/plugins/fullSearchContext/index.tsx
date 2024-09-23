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

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { ChannelRecord, MessageRecord } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, ClipboardUtils, ContextMenuApi, i18n, Menu, UserStore } from "@webpack/common";
import type { MouseEvent } from "react";

const { useMessageMenu } = findByPropsLazy("useMessageMenu");
const IdIcon = findComponentByCodeLazy("M15.3 14.48c-.46.45-1.08.67-1.86.67h");

function MessageMenu({ message, channel, onHeightUpdate }: {
    message: MessageRecord;
    channel: ChannelRecord;
    onHeightUpdate: any;
}) {
    const canReport = message.author.id !== UserStore.getCurrentUser()!.id && !message.author.system;

    return useMessageMenu({
        navId: "message-actions",
        ariaLabel: i18n.Messages.MESSAGE_UTILITIES_A11Y_LABEL,

        message,
        channel,
        canReport,
        onHeightUpdate,
        onClose: () => { ContextMenuApi.closeContextMenu(); },

        textSelection: "",
        favoriteableType: null,
        favoriteableId: null,
        favoriteableName: null,
        itemHref: undefined,
        itemSrc: undefined,
        itemSafeSrc: undefined,
        itemTextContent: undefined,

        isFullSearchContextMenu: true
    });
}

const contextMenuPatch = ((children, props) => {
    if (props?.isFullSearchContextMenu == null) return;

    const group = findGroupChildrenByChildId("devmode-copy-id", children, true);
    group?.push(
        <Menu.MenuItem
            id={`devmode-copy-id-${props.message.author.id}`}
            label={i18n.Messages.COPY_ID_AUTHOR}
            action={() => { ClipboardUtils.copy(props.message.author.id); }}
            icon={IdIcon}
        />
    );
}) satisfies NavContextMenuPatchCallback;

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

    handleContextMenu(event: MouseEvent, message: MessageRecord) {
        const channel = ChannelStore.getChannel(message.channel_id);
        if (!channel) return;

        event.stopPropagation();

        ContextMenuApi.openContextMenu(event, contextMenuProps => (
            <MessageMenu
                message={message}
                channel={channel}
                onHeightUpdate={contextMenuProps.onHeightUpdate}
            />
        ));
    },

    contextMenus: {
        "message-actions": contextMenuPatch
    }
});
