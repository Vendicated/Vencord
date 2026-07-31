import { BadgePosition, ProfileBadge } from "@api/Badges";
import type { SharedEffectiveProfile } from "@api/SharedCustomProfiles";
import { React } from "@webpack/common";

import { CustomBadgeVisual } from "./components/CustomBadgeVisual";

export interface BadgeDefinition {
    id: string;
    description: string;
    flag: number;
    iconHash: string;
    discordId: string;
}

export interface SpecialBadgeDefinition {
    id: string;
    description: string;
    iconHash: string;
    discordId: string;
}

export function badgeIcon(hash: string): string {
    return `https://cdn.discordapp.com/badge-icons/${hash}.png`;
}

export const PROFILE_BADGES: BadgeDefinition[] = [
    {
        id: "staff",
        description: "Discord Staff",
        flag: 1 << 0,
        iconHash: "5e74e9b61934fc1f67c65515d1f7e60d",
        discordId: "staff",
    },
    {
        id: "partner",
        description: "Partnered Server Owner",
        flag: 1 << 1,
        iconHash: "3f9748e53446a137a052f3454e2de41e",
        discordId: "partner",
    },
    {
        id: "hypesquad_events",
        description: "HypeSquad Events",
        flag: 1 << 2,
        iconHash: "bf01d1073931f921909045f3a39fd264",
        discordId: "hypesquad",
    },
    {
        id: "bug_hunter_1",
        description: "Discord Bug Hunter",
        flag: 1 << 3,
        iconHash: "2717692c7dca7289b35297368a940dd0",
        discordId: "bug_hunter_level_1",
    },
    {
        id: "hypesquad_bravery",
        description: "HypeSquad Bravery",
        flag: 1 << 6,
        iconHash: "8a88d63823d8a71cd5e390baa45efa02",
        discordId: "hypesquad_house_1",
    },
    {
        id: "hypesquad_brilliance",
        description: "HypeSquad Brilliance",
        flag: 1 << 7,
        iconHash: "011940fd013da3f7fb926e4a1cd2e618",
        discordId: "hypesquad_house_2",
    },
    {
        id: "hypesquad_balance",
        description: "HypeSquad Balance",
        flag: 1 << 8,
        iconHash: "3aa41de486fa12454c3761e8e223442e",
        discordId: "hypesquad_house_3",
    },
    {
        id: "early_supporter",
        description: "Early Nitro Supporter",
        flag: 1 << 9,
        iconHash: "7060786766c9c840eb3019e725d2b358",
        discordId: "early_supporter",
    },
    {
        id: "moderator_alumni",
        description: "Moderator Programs Alumni",
        flag: 1 << 18,
        iconHash: "fee1624003e2fee35cb398e125dc479b",
        discordId: "certified_moderator",
    },
    {
        id: "bug_hunter_2",
        description: "Discord Bug Hunter",
        flag: 1 << 14,
        iconHash: "848f79194d4be5ff5f81505cbd0ce1e6",
        discordId: "bug_hunter_level_2",
    },
    {
        id: "verified_developer",
        description: "Early Verified Bot Developer",
        flag: 1 << 17,
        iconHash: "6df5892e0f35b051f8b61eace34f4967",
        discordId: "verified_developer",
    },
    {
        id: "active_developer",
        description: "Active Developer",
        flag: 1 << 22,
        iconHash: "6bdc42827a38498929a4920da12695d9",
        discordId: "active_developer",
    },
];

export const SPECIAL_BADGES: SpecialBadgeDefinition[] = [
    {
        id: "quest_completed",
        description: "Quest Completed",
        iconHash: "7d9ae358c8c5e118768335dbe68b4fb8",
        discordId: "quest_completed",
    },
    {
        id: "orbs_apprentice",
        description: "Collected the Orb Profile Badge",
        iconHash: "83d8a1eb09a8d64e59233eec5d4d5c2d",
        discordId: "orb_profile_badge",
    },
    {
        id: "legacy_username",
        description: "Originally known as #0000",
        iconHash: "6de6d34650760ba5551a79732e98ed60",
        discordId: "legacy_username",
    },
];

export function computePublicFlags(selectedBadgeIds: string[]): number {
    let flags = 0;
    for (const badge of PROFILE_BADGES) {
        if (selectedBadgeIds.includes(badge.id)) flags |= badge.flag;
    }
    return flags;
}

export function buildNativeProfileBadges(
    profile: Pick<
        SharedEffectiveProfile,
        "selectedBadges" | "selectedSpecialBadges"
    >,
) {
    const badges = [];
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
    return badges;
}

export function buildBadgeApiBadges(
    profile: SharedEffectiveProfile,
): ProfileBadge[] {
    const badges: ProfileBadge[] = [];
    let idx = 0;

    for (const custom of profile.customBadges) {
        if (!custom.enabled || !custom.name.trim()) continue;
        const badge = custom;
        const Visual = function SharedCustomBadge() {
            return React.createElement(CustomBadgeVisual, { badge });
        };
        badges.push({
            id: `vc-scp-custom-${custom.id}-${idx++}`,
            key: custom.name,
            description: custom.name,
            component: Visual,
            position: BadgePosition.END,
        });
    }

    if (profile.replaceRealBadges) return badges;

    for (const badgeId of profile.selectedBadges) {
        const def = PROFILE_BADGES.find((b) => b.id === badgeId);
        if (!def) continue;
        badges.push({
            id: `vc-scp-${def.id}-${idx++}`,
            description: def.description,
            iconSrc: badgeIcon(def.iconHash),
            position: BadgePosition.START,
        });
    }

    for (const specialId of profile.selectedSpecialBadges) {
        const def = SPECIAL_BADGES.find((b) => b.id === specialId);
        if (!def) continue;
        badges.push({
            id: `vc-scp-${def.id}-${idx++}`,
            description: def.description,
            iconSrc: badgeIcon(def.iconHash),
            position: BadgePosition.END,
        });
    }

    return badges;
}
