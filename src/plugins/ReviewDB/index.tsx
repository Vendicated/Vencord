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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import ExpandableHeader from "@components/ExpandableHeader";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Alerts, Menu, Parser, showToast, useState } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { Auth, initAuth, updateAuth } from "./auth";
import { openReviewsModal } from "./components/ReviewModal";
import ReviewsView from "./components/ReviewsView";
import { NotificationType } from "./entities";
import { getCurrentUserInfo, readNotification } from "./reviewDbApi";
import { settings } from "./settings";

const guildPopoutPatch: NavContextMenuPatchCallback = (children, props: { guild: Guild, onClose(): void; }) => () => {
    children.push(
        <Menu.MenuItem
            label="View Reviews"
            id="vc-rdb-server-reviews"
            icon={OpenExternalIcon}
            action={() => openReviewsModal(props.guild.id, props.guild.name)}
        />
    );
};

export default definePlugin({
    name: "ReviewDB",
    description: "Review other users (Adds a new settings to profiles)",
    authors: [Devs.mantikafasi, Devs.Ven],

    settings,

    patches: [
        {
            find: "showBorder:null",
            replacement: {
                match: /user:(.{1,3}),setNote:.{1,3},canDM.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            }
        }
    ],

    flux: {
        CONNECTION_OPEN: initAuth,
    },

    async start() {
        addContextMenuPatch("guild-header-popout", guildPopoutPatch);

        const s = settings.store;
        const { lastReviewId, notifyReviews } = s;

        const legacy = s as any as { token?: string; };
        if (legacy.token) {
            await updateAuth({ token: legacy.token });
            legacy.token = undefined;
            new Logger("ReviewDB").info("Migrated legacy settings");
        }

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

    stop() {
        removeContextMenuPatch("guild-header-popout", guildPopoutPatch);
    },

    getReviewsComponent: ErrorBoundary.wrap((user: User) => {
        const [reviewCount, setReviewCount] = useState<number>();

        return (
            <ExpandableHeader
                headerText="User Reviews"
                onMoreClick={() => openReviewsModal(user.id, user.username)}
                moreTooltipText={
                    reviewCount && reviewCount > 50
                        ? `View all ${reviewCount} reviews`
                        : "Open Review Modal"
                }
                onDropDownClick={state => settings.store.reviewsDropdownState = !state}
                defaultState={settings.store.reviewsDropdownState}
            >
                <ReviewsView
                    discordId={user.id}
                    name={user.username}
                    onFetchReviews={r => setReviewCount(r.reviewCount)}
                    showInput
                />
            </ExpandableHeader>
        );
    }, { message: "Failed to render Reviews" })
});
