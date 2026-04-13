/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";

export default definePlugin({
    name: "DiscordTrackerLink",
    description: "Adds a button to open user profiles in Discord Tracker",
    authors: [Devs.hell1sh],

    contextMenus: {
        "user-context": (children, { user }) => {
            if (!user) return;

            children.push(
                <Menu.MenuItem
                    id="open-discord-tracker"
                    label="Open in Discord Tracker"
                    action={() => {
                        const url = `https://discord-tracker.com/tracker/user/${user.id}`;
                        window.open(url, "_blank");
                    }}
                />
            );
        }
    }
});
