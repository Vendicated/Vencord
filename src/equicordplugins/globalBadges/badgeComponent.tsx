/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, Tooltip, UserStore } from "@webpack/common";
import { JSX } from "react";

import { BadgeModalComponent, openBadgeModal } from "./badgeModal";
import { settings } from "./settings";
import { BadgeCache } from "./types";
import { fetchBadges, serviceMap } from "./utils";

export let badgeImages;

export const BadgeComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    style={{
                        width: "20px",
                        height: "20px",
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
    const badgeModal: JSX.Element[] = [];

    Object.keys(badges).forEach(mod => {
        if (!badges[mod] || !Array.isArray(badges[mod]) || badges[mod].length === 0) return;

        badges[mod].forEach(badge => {
            if (!badge || !badge.tooltip || !badge.badge) return;

            const modDisplay = serviceMap[mod.toLowerCase()] || mod;
            const prefix = settings.store.showPrefix ? `(${modDisplay})` : "";
            const suffix = settings.store.showSuffix ? `(${modDisplay})` : "";
            const displayName = `${prefix} ${badge.tooltip} ${suffix}`;

            if (mod.toLowerCase() === "badgevault") {
                badge.custom = true;
            }

            globalBadges.push(<BadgeComponent name={displayName} img={badge.badge} />);
            badgeModal.push(<BadgeModalComponent name={displayName} img={badge.badge} />);
        });
    });
    badgeImages = badgeModal;

    return (
        <div
            className="vc-global-badges"
            style={{ alignItems: "center", display: "flex" }}
            onClick={_ => openBadgeModal(UserStore.getUser(userId))}
        >
            {globalBadges}
        </div>
    );
};
