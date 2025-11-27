/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { classNameFactory } from "@api/Styles";
import { Button } from "@components/Button";
import { BadgeContextMenu } from "@plugins/_api/badges";
import { Devs, EquicordDevs } from "@utils/constants";
import { openInviteModal } from "@utils/discord";
import definePlugin from "@utils/types";
import { ContextMenuApi, React } from "@webpack/common";

import { settings } from "./settings";

let GlobalBadges = {};
let intervalId: any;
const INVITE_LINK = "kwHCJPxp8t";
const cl = classNameFactory("vc-global-badges-");

async function loadBadges() {
    const globalBadges = await fetch("https://badges.equicord.org/users", { cache: "no-cache" })
        .then(r => r.json());

    const filteredUsers: Record<string, typeof globalBadges.users[string]> = {};

    for (const key in globalBadges.users) {
        filteredUsers[key] = globalBadges.users[key].map(b => {
            if (b.url) {
                return { tooltip: b.label, badge: b.url };
            }
            return b;
        }).filter(b => {
            const url = b.badge;
            // fix this when creations updates it
            return url &&
                url.startsWith("https://") &&
                !url.startsWith("https://cdn.discordapp.com") &&
                !url.startsWith("https://images.equicord.org") &&
                !(url.startsWith("https://badges.vencord.dev/badges") && !url.startsWith("https://badges.vencord.dev/badges/reviewdb")) &&
                // !(!settings.store.showAero && url.startsWith(":aero_icon:")) &&
                // !(!settings.store.showVelocity && url.startsWith("Velocity")) &&
                // !(!settings.store.showVelocity && url.startsWith("Official Velocity")) &&
                !(!settings.store.showCustom && url.startsWith("https://gb.obamabot.me")) &&
                !(!settings.store.showNekocord && url.startsWith("https://nekocord.dev")) &&
                !(!settings.store.showReviewDB && url.startsWith("https://badges.vencord.dev/badges/reviewdb")) &&
                !(!settings.store.showAliucord && url.startsWith("https://aliucord.com")) &&
                !(!settings.store.showRa1ncord && url.startsWith("https://codeberg.org/raincord/badges")) &&
                !(!settings.store.showEnmity && url.startsWith("https://raw.githubusercontent.com/enmity-mod/badges"));

        });
    }

    GlobalBadges = filteredUsers;
}

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    authors: [Devs.HypedDomi, EquicordDevs.Wolfie, Devs.thororen],
    settings,
    settingsAboutComponent: () => (
        <>
            <Button
                variant="link"
                className={cl("settings-button")}
                onClick={() => openInviteModal(INVITE_LINK)}
            >
                Join GlobalBadges Server
            </Button>
        </>
    ),
    async start() {
        await loadBadges();
        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30);
    },
    async stop() {
        clearInterval(intervalId);
    },
    get GlobalBadges() {
        return GlobalBadges;
    },
    getGlobalBadges(userId: string) {
        return GlobalBadges[userId]?.map(badge => ({
            iconSrc: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)"
                }
            },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },

        } satisfies ProfileBadge));
    }
});
