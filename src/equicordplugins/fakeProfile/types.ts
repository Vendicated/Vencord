/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "discord-types/general";

export interface Badge {
    asset: string;
    description: string;
    icon: string;
    link?: string;
}

export interface DecorationData {
    asset: string;
    skuId: string;
    animated: boolean;
}
export interface AvatarDecoration {
    asset: string;
    skuId: string;
    animated: boolean;
}
export interface UserProfile extends User {
    profileEffectId: string;
    userId: string;
    themeColors?: Array<number>;

}
export interface UserProfileData {
    profile_effect: string;
    banner: string;
    avatar: string;
    badges: Badge[];
    decoration: DecorationData;
}

export interface Colors {
    primary: number;
    accent: number;
}

export interface fakeProfileSectionProps {
    hideTitle?: boolean;
    hideDivider?: boolean;
    noMargin?: boolean;
}
