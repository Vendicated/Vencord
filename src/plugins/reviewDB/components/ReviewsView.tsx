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

import { classes } from "@utils/misc";
import { useAwaiter, useForceUpdater } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Forms, React, UserStore } from "@webpack/common";
import { KeyboardEvent } from "react";

import { Review } from "../entities";
import { addReview, getReviews, Response, REVIEWS_PER_PAGE } from "../reviewDbApi";
import { settings } from "../settings";
import { authorize, cl, showToast } from "../utils";
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

    const [reviewData] = useAwaiter(() => getReviews(discordId, (page - 1) * REVIEWS_PER_PAGE), {
        fallbackValue: null,
        deps: [refetchSignal, signal, page],
        onSuccess: data => onFetchReviews(data!)
    });

    if (!reviewData) return null;

    return (
        <>
            <ReviewList
                refetch={refetch}
                reviews={reviewData!.reviews}
            />

            {showInput && (
                <ReviewsInputComponent
                    name={name}
                    discordId={discordId}
                    refetch={refetch}
                    isAuthor={reviewData!.reviews?.some(r => r.sender.discordID === UserStore.getCurrentUser().id)}
                />
            )}
        </>
    );
}

export function ReviewList({ refetch, reviews }: { refetch(): void; reviews: Review[]; }) {
    return (
        <div className={cl("view")}>
            {reviews?.map(review =>
                <ReviewComponent
                    key={review.id}
                    review={review}
                    refetch={refetch}
                />
            )}

            {reviews?.length === 0 && (
                <Forms.FormText className={cl("placeholder")}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}
        </div>
    );
}

export function ReviewsInputComponent({ discordId, isAuthor, refetch, name }: { discordId: string, name: string; isAuthor: boolean; refetch(): void; }) {
    const { token } = settings.store;

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
            className={classes(Classes.inputDefault, "enter-comment", cl("input"))}
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
        />
    );
}
