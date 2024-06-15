/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { AvatarDecorationData } from "./UserRecord";

export interface GuildMember {
    avatar: string | null;
    avatarDecoration: AvatarDecorationData | undefined;
    colorRoleId: string | undefined;
    colorString: string | undefined;
    communicationDisabledUntil: string | null;
    flags: GuildMemberFlags;
    fullProfileLoadedTimestamp: number | undefined;
    guildId: string;
    highestRoleId: string | undefined;
    hoistRoleId: string | undefined;
    iconRoleId: string | undefined;
    isPending: boolean;
    joinedAt: string;
    nick: string | null;
    premiumSince: string | null;
    roles: string[];
    unusualDMActivityUntil: string | Nullish;
    userId: string;
}

export enum GuildMemberFlags {
    DID_REJOIN = 1 << 0,
    COMPLETED_ONBOARDING = 1 << 1,
    BYPASSES_VERIFICATION = 1 << 2,
    STARTED_ONBOARDING = 1 << 3,
    IS_GUEST = 1 << 4,
    STARTED_HOME_ACTIONS = 1 << 5,
    COMPLETED_HOME_ACTIONS = 1 << 6,
    AUTOMOD_QUARANTINED_USERNAME_OR_GUILD_NICKNAME = 1 << 7,
    AUTOMOD_QUARANTINED_BIO = 1 << 8,
    DM_SETTINGS_UPSELL_ACKNOWLEDGED = 1 << 9,
    AUTOMOD_QUARANTINED_CLAN_TAG = 1 << 10,
}
