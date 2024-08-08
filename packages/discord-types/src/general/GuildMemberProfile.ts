/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { ProfileBadge, ProfileThemeColors } from "./UserProfile";

export interface GuildMemberProfile {
    accentColor: number | Nullish;
    badges: ProfileBadge[];
    banner: string | Nullish;
    bio: string | undefined;
    guildId: string;
    /** @todo Does not seem to be implemented. */
    popoutAnimationParticleType: any /* | Nullish */;
    profileEffectId: string | undefined;
    pronouns: string;
    themeColors: ProfileThemeColors | Nullish;
    userId: string;
}
