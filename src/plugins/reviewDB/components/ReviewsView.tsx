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

import { classes, useAwaiter } from "@utils/misc";
import { findLazy } from "@webpack";
import { Forms, React, Text, UserStore } from "@webpack/common";
import type { KeyboardEvent } from "react";

import { addReview, getReviews } from "../Utils/ReviewDBAPI";
import { showToast } from "../Utils/Utils";
import ReviewComponent from "./ReviewComponent";

const Classes = findLazy(m => typeof m.textarea === "string");

export default function ReviewsView({ userId }: { userId: string; }) {
    const [refetchCount, setRefetchCount] = React.useState(0);
    const [reviews, _, isLoading] = useAwaiter(() => getReviews(userId), {
        fallbackValue: [],
        deps: [refetchCount],
    });
    const username = UserStore.getUser(userId)?.username ?? "";

    const dirtyRefetch = () => setRefetchCount(refetchCount + 1);

    if (isLoading) return null;

    function onKeyPress({ key, target }: KeyboardEvent<HTMLTextAreaElement>) {
        if (key === "Enter") {
            addReview({
                userid: userId,
                comment: (target as HTMLInputElement).value,
                star: -1
            }).then(res => {
                if (res?.success) {
                    (target as HTMLInputElement).value = ""; // clear the input
                    dirtyRefetch();
                } else if (res?.message) {
                    showToast(res.message);
                }
            });
        }
    }

    return (
        <div className="ReviewDB">
            <Text
                tag="h2"
                variant="eyebrow"
                style={{
                    marginBottom: "12px",
                    color: "var(--header-primary)"
                }}
            >
                User Reviews
            </Text>
            {reviews?.map(review =>
                <ReviewComponent
                    key={review.id}
                    review={review}
                    refetch={dirtyRefetch}
                />
            )}
            {reviews?.length === 0 && (
                <Forms.FormText style={{ padding: "12px", paddingTop: "0px", paddingLeft: "4px", fontWeight: "bold", fontStyle: "italic" }}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}
            <textarea
                className={classes(Classes.textarea.replace("textarea", ""), "enter-comment")}
                // this produces something like '-_59yqs ...' but since no class exists with that name its fine
                placeholder={reviews?.some(r => r.sender.discordID === UserStore.getCurrentUser().id) ? `Update review for @${username}` : `Review @${username}`}
                onKeyDown={onKeyPress}
                style={{
                    marginTop: "6px",
                    resize: "none",
                    marginBottom: "12px",
                    overflow: "hidden",
                }}
            />
        </div>
    );
}
