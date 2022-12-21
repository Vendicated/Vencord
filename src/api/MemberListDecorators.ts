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

import { Channel, User } from "discord-types/general/index.js";

interface DecoratorProps {
    activities: any[];
    canUseAvatarDecorations: boolean;
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
export type Decorator = (props: DecoratorProps) => JSX.Element | null;
type OnlyIn = "guilds" | "dms";

export const decorators = new Map<string, { decorator: Decorator, onlyIn?: OnlyIn; }>();

export function addDecorator(identifier: string, decorator: Decorator, onlyIn?: OnlyIn) {
    decorators.set(identifier, { decorator, onlyIn });
}

export function removeDecorator(identifier: string) {
    decorators.delete(identifier);
}

export function __addDecoratorsToList(props: DecoratorProps): (JSX.Element | null)[] {
    const isInGuild = !!(props.guildId);
    return [...decorators.values()].map(decoratorObj => {
        const { decorator, onlyIn } = decoratorObj;
        // this can most likely be done cleaner
        if (!onlyIn || (onlyIn === "guilds" && isInGuild) || (onlyIn === "dms" && !isInGuild)) {
            return decorator(props);
        }
        return null;
    });
}
