import { BadgePosition, ProfileBadge } from "@api/Badges";
import { React } from "@webpack/common";

import { CustomBadgeVisual } from "./components/CustomBadgeVisual";

export interface CustomBadgeDefinition {
    id: string;
    name: string;
    /** 0xRRGGBB */
    color: number;
    /** Image URL, data URI, or emoji character */
    icon: string;
    enabled: boolean;
}

export const DEFAULT_CUSTOM_BADGE_COLOR = 0x5865f2;

export function createCustomBadgeId(): string {
    return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isEmojiIcon(icon: string): boolean {
    const trimmed = icon.trim();
    if (!trimmed || trimmed.startsWith("http") || trimmed.startsWith("data:"))
        return false;
    return [...trimmed].length <= 2;
}

export function resolveCustomBadgeIconSrc(icon: string): string | undefined {
    const trimmed = icon.trim();
    if (!trimmed || isEmojiIcon(trimmed)) return undefined;
    return trimmed;
}

export function buildCustomProfileBadge(
    badge: CustomBadgeDefinition,
    index: number,
): ProfileBadge {
    const Visual = function CustomBadgeInstance() {
        return React.createElement(CustomBadgeVisual, { badge });
    };

    return {
        id: `vc-cp-custom-${badge.id}-${index}`,
        key: badge.name,
        description: badge.name,
        component: Visual,
        position: BadgePosition.END,
    };
}

export function buildCustomProfileBadges(
    badges: CustomBadgeDefinition[],
): ProfileBadge[] {
    let index = 0;
    return badges
        .filter((badge) => badge.enabled && badge.name.trim())
        .map((badge) => buildCustomProfileBadge(badge, index++));
}
