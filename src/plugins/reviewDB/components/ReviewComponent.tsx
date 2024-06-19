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
import { LazyComponent } from "@utils/react";
import { filters, findBulk } from "@webpack";
import { Alerts, Parser, Timestamp, useState } from "@webpack/common";

import { Auth, getToken } from "../auth";
import { Review, ReviewType } from "../entities";
import { blockUser, deleteReview, reportReview, unblockUser } from "../reviewDbApi";
import { settings } from "../settings";
import { canBlockReviewAuthor, canDeleteReview, canReportReview, cl, showToast } from "../utils";
import { openBlockModal } from "./BlockedUserModal";
import { BlockButton, DeleteButton, ReplyButton, ReportButton } from "./MessageButton";
import ReviewBadge from "./ReviewBadge";
import { ReviewsInputComponent } from "./ReviewsView";

export default LazyComponent(() => {
    // this is terrible, blame mantika
    const p = filters.byProps;
    const [
        { cozyMessage, buttons, message, buttonsInner, groupStart },
        { container, isHeader },
        { avatar, clickable, username, wrapper, cozy },
        buttonClasses,
        botTag
    ] = findBulk(
        p("cozyMessage"),
        p("container", "isHeader"),
        p("avatar", "zalgo"),
        p("button", "wrapper", "selected"),
        p("botTagRegular")
    );

    const dateFormat = new Intl.DateTimeFormat();

    return function ReviewComponent({ review, refetch, profileId, isReply = false }: { review: Review; refetch(): void; profileId: string; isReply?: boolean; }) {
        const [showAll, setShowAll] = useState(false);
        const [replying, setReplying] = useState(false);

        const refresh = () => { refetch(); setReplying(false); };

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
                                refresh();
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
            <>
                <div className={classes(cl("review-container"), cozyMessage, wrapper, message, groupStart, cozy, isReply ? cl("reply") : cl("review"))} style={
                    {
                        marginLeft: "0px",
                        paddingLeft: "52px", // wth is this
                        // nobody knows anymore
                    }
                }>
                    {isReply && <div className={cl("reply-line")} />}

                    <>
                        <img style={{ left: "0px", zIndex: 0 }}
                            className={classes(avatar, clickable, cl("avatar"))}
                            onClick={openModal}
                            src={review.sender.profilePhoto || "/assets/1f0bfc0865d324c2587920a7d80c609b.png?size=128"}
                        />

                        <div className={cl("white-line")} />

                        <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                            <span
                                className={classes(clickable, username)}
                                style={{ color: "var(--channels-default)", fontSize: "14px" }}
                                onClick={() => openModal()}
                            >
                                {review.sender.username}
                            </span>
                            {review.type === ReviewType.System && (
                                <span
                                    className={classes(botTag.botTagVerified, botTag.botTagRegular, botTag.botTag, botTag.px, botTag.rem)}
                                    style={{ marginLeft: "4px" }}>
                                    <span className={botTag.botText}>
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
                            <div className={classes(container, isHeader, cl("buttons"))} style={{
                                padding: "0px",
                            }}>
                                <div className={classes(buttonClasses.wrapper, buttonsInner)} >
                                    {canReportReview(review) && <ReportButton onClick={reportRev} />}
                                    {canBlockReviewAuthor(profileId, review) && <BlockButton isBlocked={isAuthorBlocked} onClick={blockReviewSender} />}
                                    {canDeleteReview(profileId, review) && <DeleteButton onClick={delReview} />}
                                    {!isReply && <ReplyButton onClick={() => setReplying(!replying)} />}
                                </div>
                            </div>
                        )}
                    </>

                    {
                        review.replies?.map(r => (
                            <ReviewComponent review={r} refetch={refresh} profileId={profileId} isReply={true} />
                        ))
                    }
                    {replying && <ReviewsInputComponent repliesTo={review.id} discordId={profileId} name={review.sender.username} isAuthor={false} refetch={refresh} />}
                </div>
            </>
        );
    };
});
