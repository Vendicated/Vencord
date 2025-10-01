/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { GlobalBadges } from "./badgeComponent";
import { settings } from "./settings";
import { fetchBadges } from "./utils";

const Badge: ProfileBadge = {
    component: b => <GlobalBadges {...b} />,
    position: BadgePosition.START,
    shouldShow: userInfo => !!Object.keys(fetchBadges(userInfo.userId) ?? {}).length,
    key: "GlobalBadges"
};

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    authors: [Devs.HypedDomi, EquicordDevs.Wolfie],
    settings,
    start: () => addProfileBadge(Badge),
    stop: () => removeProfileBadge(Badge),
});
