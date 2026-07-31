import type { CustomProfileData } from "./settings";

export interface NativeProfileBadge {
    id: string;
    description: string;
    icon: string;
}

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    flag: number;
    iconHash: string;
    /** Discord's internal badge id used in profile.badges */
    discordId: string;
    /** HypeSquad houses are mutually exclusive */
    exclusiveGroup?: string;
}

export function badgeIcon(hash: string): string {
    return `https://cdn.discordapp.com/badge-icons/${hash}.png`;
}

export const PROFILE_BADGES: BadgeDefinition[] = [
    {
        id: "staff",
        name: "Discord Staff",
        description: "Discord Staff",
        flag: 1 << 0,
        iconHash: "5e74e9b61934fc1f67c65515d1f7e60d",
        discordId: "staff",
    },
    {
        id: "partner",
        name: "Partner Server Owner",
        description: "Partnered Server Owner",
        flag: 1 << 1,
        iconHash: "3f9748e53446a137a052f3454e2de41e",
        discordId: "partner",
    },
    {
        id: "hypesquad_events",
        name: "HypeSquad Events",
        description: "HypeSquad Events",
        flag: 1 << 2,
        iconHash: "bf01d1073931f921909045f3a39fd264",
        discordId: "hypesquad",
    },
    {
        id: "bug_hunter_1",
        name: "Bug Hunter Lvl 1",
        description: "Discord Bug Hunter",
        flag: 1 << 3,
        iconHash: "2717692c7dca7289b35297368a940dd0",
        discordId: "bug_hunter_level_1",
        exclusiveGroup: "bug_hunter",
    },
    {
        id: "hypesquad_bravery",
        name: "HypeSquad Bravery",
        description: "HypeSquad Bravery",
        flag: 1 << 6,
        iconHash: "8a88d63823d8a71cd5e390baa45efa02",
        discordId: "hypesquad_house_1",
        exclusiveGroup: "hypesquad_house",
    },
    {
        id: "hypesquad_brilliance",
        name: "HypeSquad Brilliance",
        description: "HypeSquad Brilliance",
        flag: 1 << 7,
        iconHash: "011940fd013da3f7fb926e4a1cd2e618",
        discordId: "hypesquad_house_2",
        exclusiveGroup: "hypesquad_house",
    },
    {
        id: "hypesquad_balance",
        name: "HypeSquad Balance",
        description: "HypeSquad Balance",
        flag: 1 << 8,
        iconHash: "3aa41de486fa12454c3761e8e223442e",
        discordId: "hypesquad_house_3",
        exclusiveGroup: "hypesquad_house",
    },
    {
        id: "early_supporter",
        name: "Early Supporter",
        description: "Early Nitro Supporter",
        flag: 1 << 9,
        iconHash: "7060786766c9c840eb3019e725d2b358",
        discordId: "early_supporter",
    },
    {
        id: "moderator_alumni",
        name: "Former Moderator",
        description: "Moderator Programs Alumni",
        flag: 1 << 18,
        iconHash: "fee1624003e2fee35cb398e125dc479b",
        discordId: "certified_moderator",
    },
    {
        id: "bug_hunter_2",
        name: "Bug Hunter Lvl 2",
        description: "Discord Bug Hunter",
        flag: 1 << 14,
        iconHash: "848f79194d4be5ff5f81505cbd0ce1e6",
        discordId: "bug_hunter_level_2",
        exclusiveGroup: "bug_hunter",
    },
    {
        id: "verified_developer",
        name: "Verified Developer",
        description: "Early Verified Bot Developer",
        flag: 1 << 17,
        iconHash: "6df5892e0f35b051f8b61eace34f4967",
        discordId: "verified_developer",
    },
    {
        id: "active_developer",
        name: "Active Developer",
        description: "Active Developer",
        flag: 1 << 22,
        iconHash: "6bdc42827a38498929a4920da12695d9",
        discordId: "active_developer",
    },
];

export interface SpecialBadgeDefinition {
    id: string;
    name: string;
    description: string;
    iconHash: string;
    discordId: string;
}

export const SPECIAL_BADGES: SpecialBadgeDefinition[] = [
    {
        id: "quest_completed",
        name: "Completed a quest",
        description: "Quest Completed",
        iconHash: "7d9ae358c8c5e118768335dbe68b4fb8",
        discordId: "quest_completed",
    },
    {
        id: "orbs_apprentice",
        name: "Orbs — Apprentice",
        description: "Collected the Orb Profile Badge",
        iconHash: "83d8a1eb09a8d64e59233eec5d4d5c2d",
        discordId: "orb_profile_badge",
    },
    {
        id: "legacy_username",
        name: "Old username",
        description: "Originally known as #0000",
        iconHash: "6de6d34650760ba5551a79732e98ed60",
        discordId: "legacy_username",
    },
];

export interface GiftBadgeDefinition {
    id: string;
    name: string;
    description: string;
    iconHash: string;
    discordId: string;
}

export const GIFT_BADGES: GiftBadgeDefinition[] = [
    {
        id: "gifting_patron",
        name: "Gifting Patron",
        description: "Gifting Patron",
        iconHash: "ac305d1b9481f312ce4419e7f8296558",
        discordId: "gifting",
    },
    {
        id: "gifting_champion",
        name: "Gifting Champion",
        description: "Gifting Champion",
        iconHash: "8b7792c4f65953d3ff564f23429cb79e",
        discordId: "gifting",
    },
    {
        id: "gifting_luminary",
        name: "Gifting Luminary",
        description: "Gifting Luminary",
        iconHash: "3119f5504b2cd09576a323908c7c3517",
        discordId: "gifting",
    },
    {
        id: "gifting_icon",
        name: "Gifting Icon",
        description: "Gifting Icon",
        iconHash: "64f2413c9b9803661322aaad25826b62",
        discordId: "gifting",
    },
    {
        id: "gifting_hero",
        name: "Gifting Hero",
        description: "Gifting Hero",
        iconHash: "77d65b1f210014a11eb1582ee06ab684",
        discordId: "gifting",
    },
    {
        id: "gifting_legend",
        name: "Gifting Legend",
        description: "Gifting Legend",
        iconHash: "7fe346cfc5da1340087d8759a9e7a395",
        discordId: "gifting",
    },
];

export type NitroTier =
    | "none"
    | "nitro"
    | "bronze"
    | "silver"
    | "gold"
    | "platinum"
    | "diamond"
    | "emerald"
    | "ruby"
    | "opal";

export const NITRO_TIERS: {
    id: NitroTier;
    name: string;
    months: number;
    iconHash: string;
    discordId: string;
    description: string;
}[] = [
    {
        id: "none",
        name: "None",
        months: -1,
        iconHash: "",
        discordId: "",
        description: "",
    },
    {
        id: "nitro",
        name: "Nitro (0 months)",
        months: 0,
        iconHash: "2ba85e8026a8614b640c2837bcdfe21b",
        discordId: "premium",
        description: "Subscriber since",
    },
    {
        id: "bronze",
        name: "Bronze (1 month)",
        months: 1,
        iconHash: "4f33c4a9c64ce221936bd256c356f91f",
        discordId: "premium_tenure_1_month_v2",
        description: "Bronze Nitro Subscriber",
    },
    {
        id: "silver",
        name: "Silver (2 months)",
        months: 2,
        iconHash: "4514fab914bdbfb4ad2fa23df76121a6",
        discordId: "premium_tenure_3_month_v2",
        description: "Silver Nitro Subscriber",
    },
    {
        id: "gold",
        name: "Gold (3 months)",
        months: 3,
        iconHash: "4514fab914bdbfb4ad2fa23df76121a6",
        discordId: "premium_tenure_3_month_v2",
        description: "Gold Nitro Subscriber",
    },
    {
        id: "platinum",
        name: "Platinum (6 months)",
        months: 6,
        iconHash: "2895086c18d5531d499862e41d1155a6",
        discordId: "premium_tenure_6_month_v2",
        description: "Platinum Nitro Subscriber",
    },
    {
        id: "diamond",
        name: "Diamond (12 months)",
        months: 12,
        iconHash: "0334688279c8359120922938dcb1d6f8",
        discordId: "premium_tenure_12_month_v2",
        description: "Diamond Nitro Subscriber",
    },
    {
        id: "emerald",
        name: "Emerald (24 months)",
        months: 24,
        iconHash: "0d61871f72bb9a33a7ae568c1fb4f20a",
        discordId: "premium_tenure_24_month_v2",
        description: "Emerald Nitro Subscriber",
    },
    {
        id: "ruby",
        name: "Ruby (36 months)",
        months: 36,
        iconHash: "11e2d339068b55d3a506cff34d3780f3",
        discordId: "premium_tenure_60_month_v2",
        description: "Ruby Nitro Subscriber",
    },
    {
        id: "opal",
        name: "Opal (72 months)",
        months: 72,
        iconHash: "5b154df19c53dce2af92c9b61e6be5e2",
        discordId: "premium_tenure_72_month_v2",
        description: "Opal Nitro Subscriber",
    },
];

export type BoostTier =
    | "none"
    | "1"
    | "2"
    | "3"
    | "6"
    | "9"
    | "12"
    | "15"
    | "18"
    | "24";

const BOOST_BADGE_DATA: Record<
    BoostTier,
    { iconHash: string; discordId: string }
> = {
    none: { iconHash: "", discordId: "" },
    "1": {
        iconHash: "51040c70d4f20a921ad6674ff86fc95c",
        discordId: "guild_booster_lvl1",
    },
    "2": {
        iconHash: "0e4080d1d333bc7ad29ef6528b6f2fb7",
        discordId: "guild_booster_lvl2",
    },
    "3": {
        iconHash: "72bed924410c304dbe3d00a6e593ff59",
        discordId: "guild_booster_lvl3",
    },
    "6": {
        iconHash: "df199d2050d3ed4ebf84d64ae83989f8",
        discordId: "guild_booster_lvl4",
    },
    "9": {
        iconHash: "996b3e870e8a22ce519b3a50e6bdd52f",
        discordId: "guild_booster_lvl5",
    },
    "12": {
        iconHash: "991c9f39ee33d7537d9f408c3e53141e",
        discordId: "guild_booster_lvl6",
    },
    "15": {
        iconHash: "cb3ae83c15e970e8f3d410bc62cb8b99",
        discordId: "guild_booster_lvl7",
    },
    "18": {
        iconHash: "7142225d31238f6387d9f09efaa02759",
        discordId: "guild_booster_lvl8",
    },
    "24": {
        iconHash: "ec92202290b48d0879b7413d2dde3bab",
        discordId: "guild_booster_lvl9",
    },
};

export const BOOST_TIERS: {
    id: BoostTier;
    name: string;
    months: number;
    iconHash: string;
    discordId: string;
}[] = [
    { id: "none", name: "None", months: -1, iconHash: "", discordId: "" },
    { id: "1", name: "1 Month", months: 1, ...BOOST_BADGE_DATA["1"] },
    { id: "2", name: "2 Months", months: 2, ...BOOST_BADGE_DATA["2"] },
    { id: "3", name: "3 Months", months: 3, ...BOOST_BADGE_DATA["3"] },
    { id: "6", name: "6 Months", months: 6, ...BOOST_BADGE_DATA["6"] },
    { id: "9", name: "9 Months", months: 9, ...BOOST_BADGE_DATA["9"] },
    { id: "12", name: "12 Months", months: 12, ...BOOST_BADGE_DATA["12"] },
    { id: "15", name: "15 Months", months: 15, ...BOOST_BADGE_DATA["15"] },
    { id: "18", name: "18 Months", months: 18, ...BOOST_BADGE_DATA["18"] },
    { id: "24", name: "24 Months", months: 24, ...BOOST_BADGE_DATA["24"] },
];

/** Build badges in Discord's native profile.badges format */
export function buildNativeProfileBadges(
    profile: Pick<
        CustomProfileData,
        | "selectedBadges"
        | "selectedSpecialBadges"
        | "nitroTier"
        | "boostTier"
        | "giftTier"
    >,
): NativeProfileBadge[] {
    const badges: NativeProfileBadge[] = [];

    for (const badgeId of profile.selectedBadges) {
        const def = PROFILE_BADGES.find((b) => b.id === badgeId);
        if (!def) continue;
        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    for (const specialId of profile.selectedSpecialBadges) {
        const def = SPECIAL_BADGES.find((b) => b.id === specialId);
        if (!def) continue;
        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    const nitro = NITRO_TIERS.find((t) => t.id === profile.nitroTier);
    if (nitro && nitro.id !== "none") {
        badges.push({
            id: nitro.discordId,
            description: nitro.description,
            icon: nitro.iconHash,
        });
    }

    const boost = BOOST_TIERS.find((t) => t.id === profile.boostTier);
    if (boost && boost.id !== "none") {
        badges.push({
            id: boost.discordId,
            description: `Server Booster (${boost.name})`,
            icon: boost.iconHash,
        });
    }

    for (const giftId of profile.giftTier) {
        const def = GIFT_BADGES.find((b) => b.id === giftId);
        if (!def) continue;
        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    return badges;
}

export function buildNativeProfileBadgesFromEffective(
    profile: Pick<
        CustomProfileData,
        "selectedBadges" | "selectedSpecialBadges" | "giftTier"
    >,
): NativeProfileBadge[] {
    const badges: NativeProfileBadge[] = [];

    for (const badgeId of profile.selectedBadges) {
        const def = PROFILE_BADGES.find((b) => b.id === badgeId);
        if (!def) continue;
        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    for (const specialId of profile.selectedSpecialBadges) {
        const def = SPECIAL_BADGES.find((b) => b.id === specialId);
        if (!def) continue;
        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    for (const giftId of profile.giftTier) {
        const def = GIFT_BADGES.find((b) => b.id === giftId);
        if (!def) continue;

        badges.push({
            id: def.discordId,
            description: def.description,
            icon: def.iconHash,
        });
    }

    return badges;
}

export function computePublicFlags(selectedBadgeIds: string[]): number {
    let flags = 0;
    for (const badge of PROFILE_BADGES) {
        if (selectedBadgeIds.includes(badge.id)) {
            flags |= badge.flag;
        }
    }
    return flags;
}

export function monthsToPremiumSince(months: number): string {
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() - months * msPerMonth).toISOString();
}
