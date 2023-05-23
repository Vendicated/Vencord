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

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import ExpandableHeader from "@components/ExpandableHeader";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, Menu } from "@webpack/common";
import { Guild, User } from "discord-types/general";

import ReviewsView from "./components/ReviewsView";
import { UserType } from "./entities/User";
import { getCurrentUserInfo } from "./Utils/ReviewDBAPI";
import { authorize, openReviewsModal, showToast } from "./Utils/Utils";

const guildHeaderPopoutContextMenuPatch = (children, props: { guild: Guild, onClose(): void; }) => () => {
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

    patches: [
        {
            find: "disableBorderColor:!0",
            replacement: {
                match: /\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            }
        }
    ],

    options: {
        authorize: {
            type: OptionType.COMPONENT,
            description: "Authorize with ReviewDB",
            component: () => (
                <Button onClick={authorize}>
                    Authorize with ReviewDB
                </Button>
            )
        },
        notifyReviews: {
            type: OptionType.BOOLEAN,
            description: "Notify about new reviews on startup",
            default: true,
        },
        showWarning: {
            type: OptionType.BOOLEAN,
            description: "Display warning to be respectful at the top of the reviews list",
            default: true,
        },
        hideTimestamps: {
            type: OptionType.BOOLEAN,
            description: "Hide timestamps on reviews",
            default: false,
        },
        website: {
            type: OptionType.COMPONENT,
            description: "ReviewDB website",
            component: () => (
                <Button onClick={() => {
                    if (Settings.plugins.ReviewDB.token) {
                        VencordNative.native.openExternal("https://reviewdb.mantikafasi.dev/api/redirect?token=" + encodeURIComponent(Settings.plugins.ReviewDB.token));
                        return;
                    } else {
                        VencordNative.native.openExternal("https://reviewdb.mantikafasi.dev/");
                    }
                }}>
                    ReviewDB website
                </Button>
            )
        },
        supportServer: {
            type: OptionType.COMPONENT,
            description: "ReviewDB Support Server",
            component: () => (
                <Button onClick={() => {
                    VencordNative.native.openExternal("https://discord.gg/eWPBSbvznt");
                }}>
                    ReviewDB Support Server
                </Button>
            )
        },
    },

    async start() {
        const settings = Settings.plugins.ReviewDB;
        if (!settings.notifyReviews || !settings.token) return;

        setTimeout(async () => {
            const user = await getCurrentUserInfo(settings.token);
            if (settings.lastReviewId < user.lastReviewID) {
                settings.lastReviewId = user.lastReviewID;
                if (user.lastReviewID !== 0)
                    showToast("You have new reviews on your profile!");
            }

            addContextMenuPatch("guild-header-popout", guildHeaderPopoutContextMenuPatch);

            if (user.banInfo) {
                const endDate = new Date(user.banInfo.banEndDate);
                if (endDate > new Date() && (settings.user?.banInfo?.banEndDate ?? 0) < endDate) {

                    Alerts.show({
                        title: "You have been banned from ReviewDB",
                        body: <>
                            <p>
                                You are banned from ReviewDB {(user.type === UserType.Banned) ? "permanently" : "until " + endDate.toLocaleString()}
                            </p>
                            {
                                user.banInfo.reviewContent &&
                                (<p>
                                    Offending Review: {user.banInfo.reviewContent}
                                </p>)
                            }
                            <p>
                                Continued offenses will result in a permanent ban.
                            </p>
                        </>,
                        cancelText: "Appeal",
                        confirmText: "Ok",
                        onCancel: () => {
                            window.open("https://reviewdb.mantikafasi.dev/api/redirect?token=" + encodeURIComponent(Settings.plugins.ReviewDB.token) + "&page=dashboard/appeal");
                        }
                    });
                }
            }

            settings.user = user;
        }, 4000);
    },
    stop() {
        removeContextMenuPatch("guild-header-popout", guildHeaderPopoutContextMenuPatch);
    },

    getReviewsComponent: (user: User) => {
        return (
            <ErrorBoundary message="Failed to render Reviews">
                <ExpandableHeader
                    headerText="User Reviews"
                    onMeatballClick={
                        () => {
                            openReviewsModal(user.id, user.username);
                        }
                    }
                    meatballTooltipText="Open Review Modal"
                    onDropDownClick={
                        state => {
                            Vencord.Settings.plugins.ReviewDB.reviewsDropdownState = !state;
                        }
                    }
                    defaultState={Vencord.Settings.plugins.ReviewDB.reviewsDropdownState}
                >
                    <ReviewsView discordId={user.id} name={user.username} />
                </ExpandableHeader>
            </ErrorBoundary >
        );
    }
});
