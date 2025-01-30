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
import { Channel, User } from "discord-types/general/index.js";
import { JSX } from "react";

interface DecoratorProps {
    activities: any[];
    channel: Channel;
    /**
     * Only for DM members
     */
    channelName?: string;
    /**
     * Only for server members
     */
    currentUser?: User;
    guildId?: string;
    isMobile: boolean;
    isOwner?: boolean;
    isTyping: boolean;
    selected: boolean;
    status: string;
    user: User;
    [key: string]: any;
}
export type MemberListDecoratorFactory = (props: DecoratorProps) => JSX.Element | null;
type OnlyIn = "guilds" | "dms";

export const decorators = new Map<string, { render: MemberListDecoratorFactory, onlyIn?: OnlyIn; }>();

export function addMemberListDecorator(identifier: string, render: MemberListDecoratorFactory, onlyIn?: OnlyIn) {
    decorators.set(identifier, { render, onlyIn });
}

export function removeMemberListDecorator(identifier: string) {
    decorators.delete(identifier);
}

export function __getDecorators(props: DecoratorProps): (JSX.Element | null)[] {
    const isInGuild = !!(props.guildId);
    return Array.from(
        decorators.entries(),
        ([key, { render: Decorator, onlyIn }]) => {
            if ((onlyIn === "guilds" && !isInGuild) || (onlyIn === "dms" && isInGuild))
                return null;

            return (
                <ErrorBoundary noop key={key} message={`Failed to render ${key} Member List Decorator`}>
                    <Decorator {...props} />
                </ErrorBoundary>
            );
        }
    );
}
