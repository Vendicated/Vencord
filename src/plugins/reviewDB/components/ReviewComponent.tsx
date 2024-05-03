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

import { openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { findByProps } from "@webpack";
import { Alerts, Parser, Timestamp, useState } from "@webpack/common";

import { Auth, getToken } from "../auth";
import { Review, ReviewType } from "../entities";
import { blockUser, deleteReview, reportReview, unblockUser } from "../reviewDbApi";
import { settings } from "../settings";
import { canBlockReviewAuthor, canDeleteReview, canReportReview, cl, showToast } from "../utils";
import { openBlockModal } from "./BlockedUserModal";
import { BlockButton, DeleteButton, ReportButton } from "./MessageButton";
import ReviewBadge from "./ReviewBadge";

const messageClasses = findByProps("cozyMessage");
const containerClasses = findByProps("container", "isHeader");
const avatarClasses = findByProps("avatar", "zalgo");
const buttonClasses = findByProps("button", "wrapper", "selected");
const botTagClasses = findByProps("botTag", "botTagRegular");

const dateFormat = new Intl.DateTimeFormat();

export default function ReviewComponent({ review, refetch, profileId }: { review: Review; refetch(): void; profileId: string; }) {
    const [showAll, setShowAll] = useState(false);

    function openModal() {
        openUserProfile(review.sender.discordID);
    }

    function delReview() {
        Alerts.show({
            title: "Are you sure?",
            body: "Do you really want to delete this review?",
            confirmText: "Delete",
            cancelText: "Nevermind",
            onConfirm: async () => {
                if (!(await getToken())) {
                    return showToast("You must be logged in to delete reviews.");
                } else {
                    deleteReview(review.id).then(res => {
                        if (res) {
                            refetch();
                        }
                    });
                }
            }
        });
    }

    function reportRev() {
        Alerts.show({
            title: "Are you sure?",
            body: "Do you really you want to report this review?",
            confirmText: "Report",
            cancelText: "Nevermind",
            // confirmColor: "red", this just adds a class name and breaks the submit button guh
            onConfirm: async () => {
                if (!(await getToken())) {
                    return showToast("You must be logged in to report reviews.");
                } else {
                    reportReview(review.id);
                }
            }
        });
    }

    const isAuthorBlocked = Auth?.user?.blockedUsers?.includes(review.sender.discordID) ?? false;

    function blockReviewSender() {
        if (isAuthorBlocked)
            return unblockUser(review.sender.discordID);

        Alerts.show({
            title: "Are you sure?",
            body: "Do you really you want to block this user? They will be unable to leave further reviews on your profile. You can unblock users in the plugin settings.",
            confirmText: "Block",
            cancelText: "Nevermind",
            // confirmColor: "red", this just adds a class name and breaks the submit button guh
            onConfirm: async () => {
                if (!(await getToken())) {
                    return showToast("You must be logged in to block users.");
                } else {
                    blockUser(review.sender.discordID);
                }
            }
        });
    }

    return (
        <div className={classes(cl("review"), messageClasses.cozyMessage, avatarClasses.wrapper, messageClasses.message, messageClasses.groupStart, avatarClasses.cozy)} style={
            {
                marginLeft: "0px",
                paddingLeft: "52px", // wth is this
                // nobody knows anymore
            }
        }>

            <img
                className={classes(avatarClasses.avatar, avatarClasses.clickable)}
                onClick={openModal}
                src={review.sender.profilePhoto || "/assets/1f0bfc0865d324c2587920a7d80c609b.png?size=128"}
                style={{ left: "0px", zIndex: 0 }}
            />
            <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                <span
                    className={classes(avatarClasses.clickable, avatarClasses.username)}
                    style={{ color: "var(--channels-default)", fontSize: "14px" }}
                    onClick={() => openModal()}
                >
                    {review.sender.username}
                </span>

                {review.type === ReviewType.System && (
                    <span
                        className={classes(botTagClasses.botTagVerified, botTagClasses.botTagRegular, botTagClasses.botTag, botTagClasses.px, botTagClasses.rem)}
                        style={{ marginLeft: "4px" }}>
                        <span className={botTagClasses.botText}>
                            System
                        </span>
                    </span>
                )}
            </div>
            {isAuthorBlocked && (
                <ReviewBadge
                    name="You have blocked this user"
                    description="You have blocked this user"
                    icon="/assets/aaee57e0090991557b66.svg"
                    type={0}
                    onClick={() => openBlockModal()}
                />
            )}
            {review.sender.badges.map(badge => <ReviewBadge {...badge} />)}

            {
                !settings.store.hideTimestamps && review.type !== ReviewType.System && (
                    <Timestamp timestamp={new Date(review.timestamp * 1000)} >
                        {dateFormat.format(review.timestamp * 1000)}
                    </Timestamp>)
            }

            <div className={cl("review-comment")}>
                {(review.comment.length > 200 && !showAll)
                    ? [Parser.parseGuildEventDescription(review.comment.substring(0, 200)), "...", <br />, (<a onClick={() => setShowAll(true)}>Read more</a>)]
                    : Parser.parseGuildEventDescription(review.comment)}
            </div>

            {review.id !== 0 && (
                <div className={classes(containerClasses.container, containerClasses.isHeader, messageClasses.buttons)} style={{
                    padding: "0px",
                }}>
                    <div className={classes(buttonClasses.wrapper, messageClasses.buttonsInner)} >
                        {canReportReview(review) && <ReportButton onClick={reportRev} />}
                        {canBlockReviewAuthor(profileId, review) && <BlockButton isBlocked={isAuthorBlocked} onClick={blockReviewSender} />}
                        {canDeleteReview(profileId, review) && <DeleteButton onClick={delReview} />}
                    </div>
                </div>
            )}
        </div>
    );
}

