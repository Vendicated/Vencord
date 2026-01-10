/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { migratePluginSetting } from "@api/Settings";
import { Button } from "@components/Button";
import { BadgeContextMenu } from "@plugins/_api/badges";
import { Devs, EquicordDevs } from "@utils/constants";
import { openInviteModal } from "@utils/discord";
import definePlugin from "@utils/types";
import { ContextMenuApi, React, Toasts, UserStore } from "@webpack/common";

import { openBadgeModal } from "./badgeModal";
import { settings } from "./settings";
import { cl, GlobalBadges, INVITE_LINK, loadBadges } from "./utils";

let intervalId: any;

migratePluginSetting("GlobalBadges", "showRaincord", "showRa1ncord");
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
    toolboxActions: {
        async "Refetch Global Badges"() {
            await loadBadges();
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched global badges!",
                type: Toasts.Type.SUCCESS
            });
        }
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
            onClick() {
                return openBadgeModal(UserStore.getUser(userId));
            },
        } satisfies ProfileBadge));
    }
});
