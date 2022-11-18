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

import { User } from "discord-types/general";
import { HTMLProps } from "react";

import Plugins from "~plugins";

export enum BadgePosition {
    START,
    END
}

export interface ProfileBadge {
    /** The tooltip to show on hover */
    tooltip: string;
    /** The custom image to use */
    image?: string;
    /** Action to perform when you click the badge */
    onClick?(): void;
    /** Should the user display this badge? */
    shouldShow?(userInfo: BadgeUserArgs): boolean;
    /** Optional props (e.g. style) for the badge */
    props?: HTMLProps<HTMLImageElement>;
    /** Insert at start or end? */
    position?: BadgePosition;

    /** The badge name to display. Discord uses this, but we don't. */
    key?: string;
}

const Badges = new Set<ProfileBadge>();

/**
 * Register a new badge with the Badges API
 * @param badge The badge to register
 */
export function addBadge(badge: ProfileBadge) {
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
export function inject(badgeArray: ProfileBadge[], args: BadgeUserArgs) {
    for (const badge of Badges) {
        if (!badge.shouldShow || badge.shouldShow(args)) {
            badge.position === BadgePosition.START
                ? badgeArray.unshift(badge)
                : badgeArray.push(badge);
        }
    }
    (Plugins.BadgeAPI as any).addDonorBadge(badgeArray, args.user.id);

    return badgeArray;
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
