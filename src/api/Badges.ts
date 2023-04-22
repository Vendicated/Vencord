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
import { User } from "discord-types/general";
import { ComponentType, HTMLProps } from "react";

import Plugins from "~plugins";

export enum BadgePosition {
    START,
    END
}

export interface ProfileBadge {
    /** The tooltip to show on hover. Required for image badges */
    description?: string;
    /** Custom component for the badge (tooltip not included) */
    component?: ComponentType<ProfileBadge & BadgeUserArgs>;
    /** The custom image to use */
    image?: string;
    link?: string;
    /** Action to perform when you click the badge */
    onClick?(): void;
    /** Should the user display this badge? */
    shouldShow?(userInfo: BadgeUserArgs): boolean;
    /** Optional props (e.g. style) for the badge, ignored for component badges */
    props?: HTMLProps<HTMLImageElement>;
    /** Insert at start or end? */
    position?: BadgePosition;
    /** The badge name to display, Discord uses this. Required for component badges */
    key?: string;
}

const Badges = new Set<ProfileBadge>();

/**
 * Register a new badge with the Badges API
 * @param badge The badge to register
 */
export function addBadge(badge: ProfileBadge) {
    badge.component &&= ErrorBoundary.wrap(badge.component, { noop: true });
    Badges.add(badge);
}

/**
 * Unregister a badge from the Badges API
 * @param badge The badge to remove
 */
export function removeBadge(badge: ProfileBadge) {
    return Badges.delete(badge);
}

/**
 * Inject badges into the profile badges array.
 * You probably don't need to use this.
 */
export function _getBadges(args: BadgeUserArgs) {
    const badges = [] as ProfileBadge[];
    for (const badge of Badges) {
        if (!badge.shouldShow || badge.shouldShow(args)) {
            badge.position === BadgePosition.START
                ? badges.unshift({ ...badge, ...args })
                : badges.push({ ...badge, ...args });
        }
    }
    const donorBadge = (Plugins.BadgeAPI as any).getDonorBadge(args.user.id);
    if (donorBadge) badges.unshift(donorBadge);

    return badges;
}

export interface BadgeUserArgs {
    user: User;
    profile: Profile;
    premiumSince: Date;
    premiumGuildSince?: Date;
}

interface ConnectedAccount {
    type: string;
    id: string;
    name: string;
    verified: boolean;
}

interface Profile {
    connectedAccounts: ConnectedAccount[];
    premiumType: number;
    premiumSince: string;
    premiumGuildSince?: any;
    lastFetched: number;
    profileFetchFailed: boolean;
    application?: any;
}
