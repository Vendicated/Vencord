/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
import { Alerts, Clickable, Menu, Parser, TooltipContainer } from "@webpack/common";

import { Auth, initAuth, updateAuth } from "./auth";
import { openReviewsModal } from "./components/ReviewModal";
import { NotificationType, ReviewType } from "./entities";
import { getCurrentUserInfo, readNotification } from "./reviewDbApi";
import { settings } from "./settings";
import { showToast } from "./utils";

const BannerButtonClasses = findByPropsLazy("bannerButton");

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
            find: ".SIDEBAR,disableToolbar:",
            replacement: {
                match: /children:\[(?=[^[]+?\.SIDEBAR}\),\i\.bot)/,
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
            await updateAuth({user});

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

                await readNotification(user.notification.id);
            }
        }, 4000);
    },

    BiteSizeReviewsButton: ErrorBoundary.wrap(({ user }: { user: User; }) => {
        return (
            <TooltipContainer text="View Reviews">
                <Clickable
                    onClick={() => openReviewsModal(user.id, user.username, ReviewType.User)}
                    className={classes(BannerButtonClasses.bannerButton)}
                >
                    <NotesIcon height={16} width={16} />
                </Clickable>
            </TooltipContainer>
        );
    }, { noop: true })
});
