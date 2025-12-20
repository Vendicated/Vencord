/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Channel, Message } from "@vencord/discord-types";
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
