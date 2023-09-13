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
import definePlugin from "@utils/types";
import { Alerts, Menu, Parser, useState } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import { openReviewsModal } from "./components/ReviewModal";
import ReviewsView from "./components/ReviewsView";
import { NotificationType } from "./entities";
import { getCurrentUserInfo, readNotification } from "./reviewDbApi";
import { settings } from "./settings";
import { showToast } from "./utils";

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
            find: "disableBorderColor:!0",
            replacement: {
                match: /\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            }
        }
    ],

    async start() {
        const s = settings.store;
        const { token, lastReviewId, notifyReviews } = s;

        if (!notifyReviews || !token) return;

        setTimeout(async () => {
            const user = await getCurrentUserInfo(token);
            if (lastReviewId && lastReviewId < user.lastReviewID) {
                s.lastReviewId = user.lastReviewID;
                if (user.lastReviewID !== 0)
                    showToast("You have new reviews on your profile!");
            }

            addContextMenuPatch("guild-header-popout", guildPopoutPatch);

            if (user.notification) {
                const props = user.notification.type === NotificationType.Ban ? {
                    cancelText: "Appeal",
                    confirmText: "Ok",
                    onCancel: () =>
                        VencordNative.native.openExternal(
                            "https://reviewdb.mantikafasi.dev/api/redirect?"
                            + new URLSearchParams({
                                token: settings.store.token!,
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
            s.user = user;
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
