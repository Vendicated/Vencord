/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { NotesIcon, OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { Guild, User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, Menu, Parser, TooltipContainer } from "@webpack/common";

import { Auth, initAuth, updateAuth } from "./auth";
import { openReviewsModal } from "./components/ReviewModal";
import { NotificationType, ReviewType } from "./entities";
import { getCurrentUserInfo, readNotification } from "./reviewDbApi";
import { settings } from "./settings";
import { showToast } from "./utils";

const RoleButtonClasses = findByPropsLazy("button", "buttonInner", "icon", "banner");

const guildPopoutPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild, onClose(): void; }) => {
    if (!guild) return;
    children.push(
        <Menu.MenuItem
            label="View Reviews"
            id="vc-rdb-server-reviews"
            icon={OpenExternalIcon}
            action={() => openReviewsModal(guild.id, guild.name, ReviewType.Server)}
        />
    );
};

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User, onClose(): void; }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            label="View Reviews"
            id="vc-rdb-user-reviews"
            icon={OpenExternalIcon}
            action={() => openReviewsModal(user.id, user.username, ReviewType.User)}
        />
    );
};

export default definePlugin({
    name: "ReviewDB",
    description: "Review other users (Adds a new settings to profiles)",
    authors: [Devs.mantikafasi, Devs.Ven],

    settings,
    contextMenus: {
        "guild-header-popout": guildPopoutPatch,
        "guild-context": guildPopoutPatch,
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    },

    patches: [
        {
            find: ".POPOUT,user:",
            replacement: {
                match: /children:\[(?=[^[]+?shouldShowTooltip:)/,
                replace: "$&$self.BiteSizeReviewsButton({user:arguments[0].user}),"
            }
        },
        {
            find: ".SIDEBAR,shouldShowTooltip:",
            replacement: {
                match: /children:\[(?=[^[]+?shouldShowTooltip:)/,
                replace: "$&$self.BiteSizeReviewsButton({user:arguments[0].user}),"
            }
        }
    ],

    flux: {
        CONNECTION_OPEN: initAuth,
    },

    async start() {
        const s = settings.store;
        const { lastReviewId, notifyReviews } = s;

        await initAuth();

        setTimeout(async () => {
            if (!Auth.token) return;

            const user = await getCurrentUserInfo(Auth.token);
            updateAuth({ user });

            if (notifyReviews) {
                if (lastReviewId && lastReviewId < user.lastReviewID) {
                    s.lastReviewId = user.lastReviewID;
                    if (user.lastReviewID !== 0)
                        showToast("You have new reviews on your profile!");
                }
            }

            if (user.notification) {
                const props = user.notification.type === NotificationType.Ban ? {
                    cancelText: "Appeal",
                    confirmText: "Ok",
                    onCancel: async () =>
                        VencordNative.native.openExternal(
                            "https://reviewdb.mantikafasi.dev/api/redirect?"
                            + new URLSearchParams({
                                token: Auth.token!,
                                page: "dashboard/appeal"
                            })
                        )
                } : {};

                Alerts.show({
                    title: user.notification.title,
                    body: (
                        Parser.parse(
                            user.notification.content,
                            false
                        )
                    ),
                    ...props
                });

                readNotification(user.notification.id);
            }
        }, 4000);
    },

    BiteSizeReviewsButton: ErrorBoundary.wrap(({ user }: { user: User; }) => {
        return (
            <TooltipContainer text="View Reviews">
                <Button
                    onClick={() => openReviewsModal(user.id, user.username, ReviewType.User)}
                    look={Button.Looks.FILLED}
                    size={Button.Sizes.NONE}
                    color={RoleButtonClasses.bannerColor}
                    className={classes(RoleButtonClasses.button, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                    innerClassName={classes(RoleButtonClasses.buttonInner, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                >
                    <NotesIcon height={16} width={16} />
                </Button>
            </TooltipContainer>
        );
    }, { noop: true })
});
