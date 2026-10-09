/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu"; 
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger"; 
import definePlugin from "@utils/types"; 
import type { User } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openBirthdayCalendarModal } from "./components/BirthdayCalendarModal";
import { openBirthdayEditModal } from "./components/BirthdayEditModal";
import { GiftIcon } from "./components/icons";
import { BirthdayNavButton } from "./components/NavButton";
import { ProfileActionButton } from "./components/ProfileActionButton";
import { ProfileBirthday } from "./components/ProfileBirthday";
import { getBirthday } from "./data";
import { runBirthdayCheck } from "./notifications";
import { settings } from "./settings";

const logger = new Logger("Birthdays");

function check() {
    runBirthdayCheck().catch(error => logger.error("Birthday check failed", error)); 
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (user == null || user.bot)
        return;
 
    children.push(
        <Menu.MenuItem
            id="vc-birthdays-set"
            label={getBirthday(user.id) == null ? "Set Birthday" : "Edit Birthday"}
            action={() => openBirthdayEditModal(user.id)}
            icon={GiftIcon}
            leadingAccessory={{ type: "icon", icon: GiftIcon }}
        />
    );
};

export default definePlugin({
    name: "Birthdays",
    description: "Keep track of your friends' birthdays, get notified on the day and browse them in a calendar",
    tags: ["Friends", "Notifications"],
    authors: [Devs.Ethjuro],

    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },
 
    patches: [
        {
            find: '"section-divider-top"',
            replacement: {
                match: /\(0,\i\.jsx\)\(\i,\{\},"section-divider-top"\)/, 
                replace: "$self.renderNavButton(),$&" 
            },
            predicate: () => settings.store.showNavButton
        },
        {
            find: "#{intl::USER_PROFILE_MEMBER_SINCE}",
            all: true,
            noWarn: true, 
            replacement: {
                match: /\(0,\i\.jsx\)\((\i\.\i),\{heading:.{0,90}?#{intl::USER_PROFILE_MEMBER_SINCE}\).{0,80}?children:\(0,\i\.jsx\)\(\i\.\i,\{userId:(\i)\.id[^}]*\}\)\}\)/g,
                replace: "[$&,$self.renderProfileSection({user:$2,Section:$1})]" 
            },
            predicate: () => settings.store.showInProfile
        },
        {
            find: '"UserProfileModalV2Renderer"',
            replacement: {
                match: /\(0,(\i)\.jsx\)\(\i\.\i,\{user:(\i),guildId:\i\}\),(?=\(0,\1\.jsx\)\(\i\.\i,\{user:\2\}\)\])/,
                replace: "$&$self.renderProfileActionButton({user:$2}),"
            },
            predicate: () => settings.store.showInProfile
        }
    ],

    toolboxActions: {
        "Open Birthday Calendar": () => openBirthdayCalendarModal()
    },

    renderNavButton: () => (
        <ErrorBoundary key="vc-birthdays-nav" noop>
            <BirthdayNavButton />
        </ErrorBoundary>
    ),
    renderProfileSection: ErrorBoundary.wrap(ProfileBirthday, { noop: true }),
    renderProfileActionButton: ErrorBoundary.wrap(ProfileActionButton, { noop: true }),

    flux: {
        CONNECTION_OPEN: check
    },

    interval: undefined as NodeJS.Timeout | undefined,
    startupTimeout: undefined as NodeJS.Timeout | undefined,

    start() {
        this.startupTimeout = setTimeout(check, 5000);
        this.interval = setInterval(check, 1800000);
    },
 
    stop() {
        clearTimeout(this.startupTimeout);
        clearInterval(this.interval);
        this.startupTimeout = undefined;
        this.interval = undefined;
    }
});
