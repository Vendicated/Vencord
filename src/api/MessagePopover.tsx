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

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { Channel, Message } from "discord-types/general";
import type { ComponentType, MouseEventHandler } from "react";

const logger = new Logger("MessagePopover");

export interface MessagePopoverButtonItem {
    key?: string,
    label: string,
    icon: ComponentType<any>,
    message: Message,
    channel: Channel,
    onClick?: MouseEventHandler<HTMLButtonElement>,
    onContextMenu?: MouseEventHandler<HTMLButtonElement>;
}

export type MessagePopoverButtonFactory = (message: Message) => MessagePopoverButtonItem | null;

export const buttons = new Map<string, MessagePopoverButtonFactory>();

export function addMessagePopoverButton(
    identifier: string,
    item: MessagePopoverButtonFactory,
) {
    buttons.set(identifier, item);
}

export function removeMessagePopoverButton(identifier: string) {
    buttons.delete(identifier);
}

export function _buildPopoverElements(
    Component: React.ComponentType<MessagePopoverButtonItem>,
    message: Message
) {
    const items: React.ReactNode[] = [];

    for (const [identifier, getItem] of buttons.entries()) {
        try {
            const item = getItem(message);
            if (item) {
                item.key ??= identifier;
                items.push(
                    <ErrorBoundary noop>
                        <Component {...item} />
                    </ErrorBoundary>
                );
            }
        } catch (err) {
            logger.error(`[${identifier}]`, err);
        }
    }

    return <>{items}</>;
}
