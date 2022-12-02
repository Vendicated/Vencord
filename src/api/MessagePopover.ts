/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Channel, Message } from "discord-types/general";
import type { MouseEventHandler } from "react";

export interface ButtonItem {
    key?: string,
    label: string,
    icon: React.ComponentType<any>,
    message: Message,
    channel: Channel,
    onClick?: MouseEventHandler<HTMLButtonElement>,
    onContextMenu?: MouseEventHandler<HTMLButtonElement>;
}

export type getButtonItem = (message: Message) => ButtonItem | null;

export const buttons = new Map<string, getButtonItem>();

export function addButton(
    identifier: string,
    item: getButtonItem,
) {
    buttons.set(identifier, item);
}

export function removeButton(identifier: string) {
    buttons.delete(identifier);
}

export function _modifyPopover(
    msg: Message,
    makeButton: (item: ButtonItem) => React.ComponentType
) {
    const btns = Array();

    for (const [identifier, getItem] of buttons.entries()) {
        const item = getItem(msg);
        if (item) {
            item.key ??= identifier;
            btns.push(makeButton(item));
        }
    }

    return btns;
}
