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

import { Auth, getToken } from "@plugins/reviewDB/auth";
import { Review, ReviewType } from "@plugins/reviewDB/entities";
import { blockUser, deleteReview, deleteReviewVote, reportReview, unblockUser, voteReview } from "@plugins/reviewDB/reviewDbApi";
import { settings } from "@plugins/reviewDB/settings";
import { canBlockReviewAuthor, canDeleteReview, canReportReview, cl, showToast } from "@plugins/reviewDB/utils";
import { openUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { ConfirmModal, IconUtils, openModal as openVencordModal, Parser, Timestamp, useEffect, useState } from "@webpack/common";

import { openBlockModal } from "./BlockedUserModal";
import { BlockButton, DeleteButton, ReportButton } from "./MessageButton";
import ReviewBadge from "./ReviewBadge";

const MessageClasses = findCssClassesLazy("cozyMessage", "message", "groupStart", "buttons", "buttonsInner");
const ContainerClasses = findCssClassesLazy("container", "isHeader");
const AvatarClasses = findCssClassesLazy("avatar", "wrapper", "cozy", "clickable", "username");
const ButtonClasses = findCssClassesLazy("button", "wrapper", "selected");
const BotTagClasses = findCssClassesLazy("botTagVerified", "botTagRegular", "botText", "px", "rem");

const dateFormat = new Intl.DateTimeFormat();

export default function ReviewComponent({ review, refetch, profileId }: { review: Review; refetch(): void; profileId: string; }) {
    const [showAll, setShowAll] = useState(false);
    const [localVote, setLocalVote] = useState<boolean | null>(review.userVote ?? null);
    const [score, setScore] = useState(review.score ?? 0);
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        setLocalVote(review.userVote ?? null);
        setScore(review.score ?? 0);
    }, [review.score, review.userVote]);

    function openModal() {
        openUserProfile(review.sender.discordID);
    }

    function delReview() {
        openVencordModal(props => (
            <ConfirmModal
                {...props}
                title="Are you sure?"
                subtitle="Do you really want to delete this review?"
                confirmText="Delete"
                cancelText="Nevermind"
                onConfirm={async () => {
                    if (!(await getToken())) {
                        return showToast("You must be logged in to delete reviews.");
                    }
                    const res = await deleteReview(review.id);
                    if (res) refetch();
                }}
            />
        ));
    }

    function reportRev() {
        openVencordModal(props => (
            <ConfirmModal
                {...props}
                title="Are you sure?"
                subtitle="Do you really want to report this review?"
                confirmText="Report"
                cancelText="Nevermind"
                onConfirm={async () => {
                    if (!(await getToken())) {
                        return showToast("You must be logged in to report reviews.");
                    }
                    await reportReview(review.id);
                }}
            />
        ));
    }

    const isAuthorBlocked = Auth?.user?.blockedUsers?.includes(review.sender.discordID) ?? false;

    function blockReviewSender() {
        if (isAuthorBlocked)
            return unblockUser(review.sender.discordID);

        openVencordModal(props => (
            <ConfirmModal
                {...props}
                title="Are you sure?"
                subtitle="Do you really want to block this user? They will be unable to leave further reviews on your profile. You can unblock users in the plugin settings."
                confirmText="Block"
                cancelText="Nevermind"
                onConfirm={async () => {
                    if (!(await getToken())) {
                        return showToast("You must be logged in to block users.");
                    }
                    await blockUser(review.sender.discordID);
                }}
            />
        ));
    }

    async function submitVote(isUpvote: boolean) {
        if (isVoting) return;

        if (review.sender.discordID === Auth.user?.discordID) {
            return showToast("You cannot vote on your own review.");
        }

        setIsVoting(true);

        try {
            if (localVote === isUpvote) {
                if (await deleteReviewVote(review.id)) {
                    setLocalVote(null);
                    setScore(currentScore => currentScore + (isUpvote ? -1 : 1));
                }
                return;
            }

            if (await voteReview(review.id, isUpvote)) {
                const delta = localVote == null
                    ? isUpvote ? 1 : -1
                    : isUpvote ? 2 : -2;

                setLocalVote(isUpvote);
                setScore(currentScore => currentScore + delta);
            }
        } finally {
            setIsVoting(false);
        }
    }

    return (
        <div className={classes(cl("review"), MessageClasses.cozyMessage, AvatarClasses.wrapper, MessageClasses.message, MessageClasses.groupStart, AvatarClasses.cozy)} style={
            {
                marginLeft: "0px",
                paddingLeft: "52px",
                paddingRight: review.id !== 0 ? "64px" : "16px",
                // nobody knows anymore
            }
        }>

            {review.id !== 0 && (
                <div className={cl("vote-column")}>
                    <span className={classes(cl("vote-column-score"), score > 0 && cl("vote-column-score-positive"), score < 0 && cl("vote-column-score-negative"))}>
                        {score}
                    </span>
                    <div className={cl("vote-column-buttons")}>
                        <button
                            className={classes(cl("vote-column-button"), !!localVote && cl("vote-column-up-selected"))}
                            disabled={isVoting}
                            onClick={() => submitVote(true)}
                            type="button"
                        >
                            <svg height="20" viewBox="0 0 12 12" width="20" fill="none">
                                <path d="M3 7.5 6 4.5l3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            </svg>
                        </button>
                        <button
                            className={classes(cl("vote-column-button"), localVote === false && cl("vote-column-down-selected"))}
                            disabled={isVoting}
                            onClick={() => submitVote(false)}
                            type="button"
                        >
                            <svg height="20" viewBox="0 0 12 12" width="20" fill="none">
                                <path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <img
                className={classes(AvatarClasses.avatar, AvatarClasses.clickable)}
                onClick={openModal}
                src={review.sender.profilePhoto ?? IconUtils.getDefaultAvatarURL(review.sender.discordID)}
                style={{ left: "0px", zIndex: 0 }}
                onError={e => e.currentTarget.src = IconUtils.getDefaultAvatarURL(review.sender.discordID)}
            />
            <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                <span
                    className={classes(AvatarClasses.clickable, AvatarClasses.username)}
                    style={{ color: "var(--channels-default)", fontSize: "14px" }}
                    onClick={() => openModal()}
                >
                    {review.sender.username}
                </span>

                {review.type === ReviewType.System && (
                    <span
                        className={classes(BotTagClasses.botTagVerified, BotTagClasses.botTagRegular, BotTagClasses.px, BotTagClasses.rem)}
                        style={{ marginLeft: "4px" }}>
                        <span className={BotTagClasses.botText}>
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
            {review.sender.badges.map((badge, idx) => <ReviewBadge key={idx} {...badge} />)}

            {
                !settings.store.hideTimestamps && review.type !== ReviewType.System && (
                    <Timestamp timestamp={new Date(review.timestamp * 1000)} >
                        {dateFormat.format(review.timestamp * 1000)}
                    </Timestamp>)
            }
            <div className={cl("review-comment")}>
                {(review.comment.length > 200 && !showAll)
                    ? (
                        <>
                            {Parser.parseGuildEventDescription(review.comment.substring(0, 200))}...
                            <br />
                            <a onClick={() => setShowAll(true)}>Read more</a>]
                        </>
                    )
                    : Parser.parseGuildEventDescription(review.comment)}
            </div>

            {review.id !== 0 && (
                <div className={classes(ContainerClasses.container, ContainerClasses.isHeader, MessageClasses.buttons)} style={{
                    padding: "0px",
                }}>
                    <div className={classes(ButtonClasses.wrapper, MessageClasses.buttonsInner)} >
                        {canReportReview(review) && <ReportButton onClick={reportRev} />}
                        {canBlockReviewAuthor(profileId, review) && <BlockButton isBlocked={isAuthorBlocked} onClick={blockReviewSender} />}
                        {canDeleteReview(profileId, review) && <DeleteButton onClick={delReview} />}
                    </div>
                </div>
            )}
        </div>
    );
}
