/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Message } from "discord-types/general/index.js";

interface DecorationProps {
    author: {
        /**
         * Will be username if the user has no nickname
         */
        nick: string;
        iconRoleId: string;
        guildMemberAvatar: string;
        colorRoleName: string;
        colorString: string;
    };
    channel: Channel;
    compact: boolean;
    decorations: {
        /**
         * Element for the [BOT] tag if there is one
         */
        0: JSX.Element | null;
        /**
         * Other decorations (including ones added with this api)
         */
        1: JSX.Element[];
    };
    message: Message;
    [key: string]: any;
}
export type Decoration = (props: DecorationProps) => JSX.Element | null;

export const decorations = new Map<string, Decoration>();

export function addDecoration(identifier: string, decoration: Decoration) {
    decorations.set(identifier, decoration);
}

export function removeDecoration(identifier: string) {
    decorations.delete(identifier);
}

export function __addDecorationsToMessage(props: DecorationProps): (JSX.Element | null)[] {
    return [...decorations.values()].map(decoration => {
        return decoration(props);
    });
}
