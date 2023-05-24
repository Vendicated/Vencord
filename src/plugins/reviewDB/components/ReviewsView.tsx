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

import { Settings } from "@api/Settings";
import { classes } from "@utils/misc";
import { useAwaiter, useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Forms, Paginator, React, UserStore, useState } from "@webpack/common";
import { KeyboardEvent } from "react";

import { Review } from "../entities/Review";
import { addReview, getReviews } from "../Utils/ReviewDBAPI";
import { authorize, REVIEWS_PER_PAGE, showToast } from "../Utils/Utils";
import ReviewComponent from "./ReviewComponent";

const Classes = findByPropsLazy("inputDefault", "editable");

interface UserProps {
    discordId: string;
    name: string;
}

interface Props extends UserProps {
    paginate?: boolean;
    onFetchReviewCount(count: number): void;
}

export default function ReviewsView({ discordId, name, paginate = false, onFetchReviewCount }: Props) {
    const [signal, refetch] = useForceUpdater(true);
    const [page, setPage] = useState(1);

    const [reviewData, _, isLoading] = useAwaiter(() => getReviews(discordId, (page - 1) * REVIEWS_PER_PAGE), {
        fallbackValue: null,
        deps: [signal, page],
        onSuccess: data => onFetchReviewCount(data!.reviewCount)
    });

    if (isLoading || !reviewData) return null;

    return (
        <>
            <ReviewList
                discordId={discordId}
                name={name}
                refetch={refetch}
                reviews={reviewData!.reviews}
            />

            {paginate && (
                <Paginator
                    currentPage={page}
                    maxVisiblePages={5}
                    pageSize={REVIEWS_PER_PAGE}
                    totalCount={reviewData.reviewCount}
                    onPageChange={setPage}
                />
            )}
        </>
    );
}

export function ReviewList({ discordId, name, refetch, reviews }: UserProps & { refetch(): void; reviews: Review[]; }) {
    const { token } = Settings.plugins.ReviewDB;

    function onKeyPress({ key, target }: KeyboardEvent<HTMLTextAreaElement>) {
        if (key === "Enter") {
            addReview({
                userid: discordId,
                comment: (target as HTMLInputElement).value,
                star: -1
            }).then(res => {
                if (res?.success) {
                    (target as HTMLInputElement).value = ""; // clear the input
                    refetch();
                } else if (res?.message) {
                    showToast(res.message);
                }
            });
        }
    }

    return (
        <div className="vc-reviewdb-view">
            {reviews?.map(review =>
                <ReviewComponent
                    key={review.id}
                    review={review}
                    refetch={refetch}
                />
            )}

            {reviews?.length === 0 && (
                <Forms.FormText style={{ paddingRight: "12px", paddingTop: "0px", paddingLeft: "0px", paddingBottom: "4px", fontWeight: "bold", fontStyle: "italic" }}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}

            <textarea
                className={classes(Classes.inputDefault, "enter-comment")}
                onKeyDownCapture={e => {
                    if (e.key === "Enter") {
                        e.preventDefault(); // prevent newlines
                    }
                }}
                placeholder={
                    token
                        ? (reviews?.some(r => r.sender.discordID === UserStore.getCurrentUser().id)
                            ? `Update review for @${name}`
                            : `Review @${name}`)
                        : "You need to authorize to review users!"
                }
                onKeyDown={onKeyPress}
                onClick={() => {
                    if (!token) {
                        showToast("Opening authorization window...");
                        authorize();
                    }
                }}

                style={{
                    marginTop: "6px",
                    resize: "none",
                    marginBottom: "12px",
                    overflow: "hidden",
                    background: "transparent",
                    border: "1px solid var(--profile-message-input-border-color)",
                    fontSize: "14px",
                }}
            />
        </div>
    );
}
