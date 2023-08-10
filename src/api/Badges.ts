/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { User } from "discord-types/general";
import { ComponentType, HTMLProps } from "react";

import Plugins from "~plugins";

export const enum BadgePosition {
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
    const donorBadges = (Plugins.BadgeAPI as unknown as typeof import("../plugins/_api/badges").default).getDonorBadges(args.user.id);
    if (donorBadges) badges.unshift(...donorBadges);

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
