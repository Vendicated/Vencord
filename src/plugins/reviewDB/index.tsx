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
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, Menu, Text, Tooltip, useState } from "@webpack/common";
import { Guild, User } from "discord-types/general";
import { cl } from "plugins/permissionsViewer/utils";

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
        const [viewReviews, setViewReviews] = useState(Vencord.Settings.plugins.ReviewDB.reviewsDropdownState);

        return (
            <ErrorBoundary message="Failed to render Reviews">
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <Text
                        tag="h2"
                        variant="eyebrow"
                        style={{
                            marginBottom: "8px",
                            color: "var(--header-primary)",
                            display: "inline"
                        }}
                    >
                        User Reviews
                    </Text>

                    <div>
                        <Tooltip text="Open Review Modal">
                            {tooltipProps => (
                                <button
                                    {...tooltipProps}
                                    className={cl("userperms-permdetails-btn")}
                                    onClick={() =>
                                        openReviewsModal(user.id, user.username)
                                    }
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                    >
                                        <path fill="var(--text-normal)" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                                    </svg>
                                </button>
                            )}
                        </Tooltip>

                        <Tooltip text={viewReviews ? "Hide Reviews" : "Show Reviews"}>
                            {tooltipProps => (
                                <button
                                    {...tooltipProps}
                                    className={cl("userperms-toggleperms-btn")}
                                    onClick={() => {
                                        setViewReviews(v => !v);
                                        Vencord.Settings.plugins.ReviewDB.reviewsDropdownState = !viewReviews;
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        transform={viewReviews ? "scale(1 -1)" : "scale(1 1)"}
                                    >
                                        <path fill="var(--text-normal)" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z" />
                                    </svg>
                                </button>
                            )}
                        </Tooltip>

                    </div>
                </div>
                {viewReviews && <ReviewsView discordId={user.id} name={user.username} />}
            </ErrorBoundary>
        );
    }
});
