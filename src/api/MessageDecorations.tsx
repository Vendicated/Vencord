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
import { Channel, Message } from "discord-types/general/index.js";
import { JSX } from "react";

export interface MessageDecorationProps {
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
export type MessageDecorationFactory = (props: MessageDecorationProps) => JSX.Element | null;

export const decorationsFactories = new Map<string, MessageDecorationFactory>();

export function addMessageDecoration(identifier: string, decoration: MessageDecorationFactory) {
    decorationsFactories.set(identifier, decoration);
}

export function removeMessageDecoration(identifier: string) {
    decorationsFactories.delete(identifier);
}

export function __addDecorationsToMessage(props: MessageDecorationProps): JSX.Element {
    const decorations = Array.from(
        decorationsFactories.entries(),
        ([key, Decoration]) => (
            <ErrorBoundary noop message={`Failed to render ${key} Message Decoration`} key={key}>
                <Decoration {...props} />
            </ErrorBoundary>
        )
    );

    return (
        <div className="vc-message-decorations-wrapper">
            {decorations}
        </div>
    );
}
