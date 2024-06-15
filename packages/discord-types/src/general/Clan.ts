/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Clan {
    badge: {
        badgeKind: ClanBadgeKind;
        primaryColor: string;
        secondaryColor: string;
    };
    banner: ClanBannerKind;
    bannerHash: string | null;
    branding: {
        primaryColor: string;
        secondaryColor: string;
    };
    description: string | null;
    games: string[];
    icon: string | null;
    id: string;
    memberCount: number;
    name: string;
    playstyle: ClanPlaystyle;
    tag: string;
    traits: string[];
    wildcardDescriptors: string[];
}

export enum ClanBadgeKind {
    SWORD = 0,
    WATER_DROP = 1,
    SKULL = 2,
    TOADSTOOL = 3,
    MOON = 4,
    LIGHTNING = 5,
    LEAF = 6,
    HEART = 7,
    FIRE = 8,
    COMPASS = 9,
    CROSSHAIRS = 10,
    FLOWER = 11,
    FORCE = 12,
    GEM = 13,
    LAVA = 14,
    PSYCHIC = 15,
    SMOKE = 16,
    SNOW = 17,
    SOUND = 18,
    SUN = 19,
    WIND = 20,
}

export enum ClanBannerKind {
    NIGHT_SKY = 0,
    CASTLE = 1,
    WORLD_MAP = 2,
    SEA_FOAM = 3,
    WARP_TUNNEL = 4,
    HOUSE = 5,
    HEIGHTMAP = 6,
    MESH = 7,
    SPATTER = 8,
}

// Original name: ClanPlaystyles
export enum ClanPlaystyle {
    NONE = 0,
    SOCIAL = 1,
    CASUAL = 2,
    COMPETITIVE = 3,
    CREATIVE = 4,
    VERY_HARDCORE = 5,
}
