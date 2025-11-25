/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Button } from "@components/Button";
import { Devs, EquicordDevs } from "@utils/constants";
import { openInviteModal } from "@utils/discord";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { GlobalBadges } from "./badgeComponent";
import { settings } from "./settings";
import { cl, fetchBadges, INVITE_LINK } from "./utils";

const Badge: ProfileBadge = {
    component: b => <GlobalBadges {...b} />,
    position: BadgePosition.START,
    shouldShow: userInfo => !!Object.keys(fetchBadges(userInfo.userId) ?? {}).length,
    key: "GlobalBadges"
};

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
    start: () => addProfileBadge(Badge),
    stop: () => removeProfileBadge(Badge),
});
