/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, Tooltip, UserStore } from "@webpack/common";
import { JSX } from "react";

import { openBadgeModal } from "./badgeModal";
import { settings } from "./settings";
import { BadgeCache } from "./types";
import { cl, fetchBadges } from "./utils";

interface BadgeModalItem {
    name: string;
    rawName: string;
}

export let badgeData;

export const BadgeComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    className={cl("badge")}
                    style={{
                        transform: name.includes("Replugged") ? "scale(0.9)" : null
                    }}
                />
            )}
        </Tooltip>
    );
};

export const GlobalBadges = ({ userId }: { userId: string; }) => {
    const [badges, setBadges] = React.useState<BadgeCache["badges"]>({});
    React.useEffect(() => setBadges(fetchBadges(userId) ?? {}), [userId]);

    if (!badges) return null;
    const globalBadges: JSX.Element[] = [];
    const badgeModal: BadgeModalItem[] = [];

    Object.keys(badges).forEach(mod => {
        if (!badges[mod] || !Array.isArray(badges[mod]) || badges[mod].length === 0) return;

        badges[mod].forEach(badge => {
            if (!badge || !badge.tooltip || !badge.badge) return;

            const prefix = settings.store.showPrefix ? `(${mod})` : "";
            const suffix = settings.store.showSuffix ? `(${mod})` : "";
            const displayName = `${prefix} ${badge.tooltip} ${suffix}`;

            if (mod === "BadgeVault") {
                badge.custom = true;
            }

            globalBadges.push(<BadgeComponent name={displayName} img={badge.badge} />);
            badgeModal.push({
                name: displayName,
                rawName: badge.tooltip,
                ...badge
            });
        });
    });
    badgeData = badgeModal;

    return (
        <div
            className={cl("badges")}
            onClick={_ => openBadgeModal(UserStore.getUser(userId))}
        >
            {globalBadges}
        </div>
    );
};
