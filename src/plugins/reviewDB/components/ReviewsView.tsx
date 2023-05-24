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
import { Forms, React } from "@webpack/common";
import { KeyboardEvent } from "react";

import { Review } from "../entities/Review";
import { addReview, getReviews, Response, REVIEWS_PER_PAGE } from "../Utils/ReviewDBAPI";
import { authorize, showToast } from "../Utils/Utils";
import ReviewComponent from "./ReviewComponent";

const Classes = findByPropsLazy("inputDefault", "editable");

interface UserProps {
    discordId: string;
    name: string;
}

interface Props extends UserProps {
    onFetchReviews(data: Response): void;
    refetchSignal?: unknown;
    showInput?: boolean;
    page?: number;
}

export default function ReviewsView({ discordId, name, onFetchReviews, refetchSignal, page = 1, showInput = false }: Props) {
    const [signal, refetch] = useForceUpdater(true);

    const [reviewData, _, isLoading] = useAwaiter(() => getReviews(discordId, (page - 1) * REVIEWS_PER_PAGE), {
        fallbackValue: null,
        deps: [refetchSignal, signal, page],
        onSuccess: data => onFetchReviews(data!)
    });

    if (isLoading || !reviewData) return null;

    return (
        <ReviewList
            refetch={refetch}
            reviews={reviewData!.reviews}
        />
    );
}

export function ReviewList({ refetch, reviews }: { refetch(): void; reviews: Review[]; }) {
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
                <Forms.FormText style={{
                    paddingRight: 12,
                    paddingBottom: 4,
                    fontWeight: "bold",
                    fontStyle: "italic"
                }}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}
        </div>
    );
}

export function ReviewsInputComponent({ discordId, isAuthor, refetch, name }: { discordId: string, name: string; isAuthor: boolean; refetch(): void; }) {
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
        <textarea
            className={classes(Classes.inputDefault, "enter-comment")}
            onKeyDownCapture={e => {
                if (e.key === "Enter") {
                    e.preventDefault(); // prevent newlines
                }
            }}
            placeholder={
                !token
                    ? "You need to authorize to review users!"
                    : isAuthor
                        ? `Update review for @${name}`
                        : `Review @${name}`
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
                marginBottom: "12px",
                resize: "none",
                overflow: "hidden",
                background: "transparent",
                border: "1px solid var(--profile-message-input-border-color)",
                fontSize: "14px",
            }}
        />
    );
}
