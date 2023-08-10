/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Channel, Message } from "discord-types/general";
import type { MouseEventHandler } from "react";

const logger = new Logger("MessagePopover");

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

export function _buildPopoverElements(
    msg: Message,
    makeButton: (item: ButtonItem) => React.ComponentType
) {
    const items = [] as React.ComponentType[];

    for (const [identifier, getItem] of buttons.entries()) {
        try {
            const item = getItem(msg);
            if (item) {
                item.key ??= identifier;
                items.push(makeButton(item));
            }
        } catch (err) {
            logger.error(`[${identifier}]`, err);
        }
    }

    return items;
}
