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

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";

import { settings } from "./settings";
import { Accessory, handleTranslate } from "./utils/accessory";
import { Icon } from "./utils/icon";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message.content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="ec-trans"
            label="Translate"
            icon={Icon}
            action={() => handleTranslate(message)}
        />
    ));
};

export default definePlugin({
    name: "Translate+",
    description: "Vencord's translate plugin but with support for artistic languages!",
    dependencies: ["MessageAccessoriesAPI"],
    authors: [Devs.Ven, EquicordDevs.Prince527],
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },

    start() {
        addMessageAccessory("ec-translation", props => <Accessory message={props.message} />);

        addMessagePopoverButton("ec-translate", message => {
            if (!message.content) return null;

            return {
                label: "Translate",
                icon: Icon,
                message: message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => handleTranslate(message),
            };
        });
    },
    stop() {
        removeMessagePopoverButton("ec-translate");
        removeMessageAccessory("ec-translation");
    }
});
