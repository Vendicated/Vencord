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

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { ExpandableHeader } from "@components/ExpandableHeader";
import { NotesIcon, OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import type { GuildRecord, UserRecord } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { AlertActionCreators, Button, MarkupUtils, Menu, TooltipContainer, useState } from "@webpack/common";

import { Auth, initAuth, updateAuth } from "./auth";
import { openReviewsModal } from "./components/ReviewModal";
import ReviewsView from "./components/ReviewsView";
import { NotificationType } from "./entities";
import { getCurrentUserInfo, readNotification } from "./reviewDbApi";
import { settings } from "./settings";
import { showToast } from "./utils";

const RoleButtonClasses: Record<string, string> = findByPropsLazy("button", "buttonInner", "icon", "text");

const guildPopoutPatch = ((children, { guild }: { guild?: GuildRecord; onClose: () => void; }) => {
    if (!guild) return;
    children.push(
        <Menu.MenuItem
            label="View Reviews"
            id="vc-rdb-server-reviews"
            icon={OpenExternalIcon}
            action={() => { openReviewsModal(guild.id, guild.name); }}
        />
    );
}) satisfies NavContextMenuPatchCallback;

const userContextPatch = ((children, { user }: { user?: UserRecord, onClose(): void; }) => {
    if (user)
        children.push(
            <Menu.MenuItem
                label="View Reviews"
                id="vc-rdb-user-reviews"
                icon={OpenExternalIcon}
                action={() => { openReviewsModal(user.id, user.username); }}
            />
        );
}) satisfies NavContextMenuPatchCallback;

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
            find: "showBorder:null",
            replacement: {
                match: /user:(\i),setNote:\i,canDM.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            }
        },
        {
            find: ".BITE_SIZE,user:",
            replacement: {
                match: /(?<=\.BITE_SIZE,children:\[)\(0,\i\.jsx\)\(\i\.\i,\{user:(\i),/,
                replace: "$self.BiteSizeReviewsButton({user:$1}),$&"
            }
        }
    ],

    flux: {
        CONNECTION_OPEN: initAuth,
    },

    async start() {
        const { store } = settings;
        const { lastReviewId, notifyReviews } = store;

        await initAuth();

        setTimeout(async () => {
            if (!Auth.token) return;

            const user = await getCurrentUserInfo(Auth.token);
            updateAuth({ user });

            if (notifyReviews) {
                if (lastReviewId && lastReviewId < user.lastReviewID) {
                    store.lastReviewId = user.lastReviewID;
                    if (user.lastReviewID !== 0)
                        showToast("You have new reviews on your profile!");
                }
            }

            if (user.notification) {
                const props = user.notification.type === NotificationType.Ban ? {
                    cancelText: "Appeal",
                    confirmText: "Ok",
                    onCancel: () => {
                        VencordNative.native.openExternal(
                            "https://reviewdb.mantikafasi.dev/api/redirect?"
                            + new URLSearchParams({
                                token: Auth.token!,
                                page: "dashboard/appeal"
                            })
                        );
                    }
                } : {};

                AlertActionCreators.show({
                    title: user.notification.title,
                    body: (
                        MarkupUtils.parse(
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

    getReviewsComponent: ErrorBoundary.wrap((user: UserRecord) => {
        const [reviewCount, setReviewCount] = useState<number>();

        return (
            <ExpandableHeader
                headerText="User Reviews"
                onMoreClick={() => { openReviewsModal(user.id, user.username); }}
                moreTooltipText={
                    reviewCount && reviewCount > 50
                        ? `View all ${reviewCount} reviews`
                        : "Open Review Modal"
                }
                onDropDownClick={state => { settings.store.reviewsDropdownState = !state; }}
                defaultState={settings.store.reviewsDropdownState}
            >
                <ReviewsView
                    discordId={user.id}
                    name={user.username}
                    onFetchReviews={r => { setReviewCount(r.reviewCount); }}
                    showInput
                />
            </ExpandableHeader>
        );
    }, { message: "Failed to render Reviews" }),

    BiteSizeReviewsButton: ErrorBoundary.wrap(({ user }: { user: UserRecord; }) => (
        <TooltipContainer text="View Reviews">
            <Button
                onClick={() => { openReviewsModal(user.id, user.username); }}
                look={Button.Looks.FILLED}
                size={Button.Sizes.NONE}
                color={RoleButtonClasses.color}
                className={classes(RoleButtonClasses.button, RoleButtonClasses.banner)}
                innerClassName={classes(RoleButtonClasses.buttonInner, RoleButtonClasses.banner)}
            >
                <NotesIcon height={16} width={16} />
            </Button>
        </TooltipContainer>
    ), { noop: true })
});
