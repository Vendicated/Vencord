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

import type { KeyboardEvent } from "react";

import { classes, lazyWebpack, useAwaiter } from "../../../utils/misc";
import { Forms, Text, UserStore } from "../../../webpack/common";
import { addReview, getReviews } from "../Utils/ReviewDBAPI";
import ReviewComponent from "./ReviewComponent";

const Classes = lazyWebpack(m => typeof m.textarea === "string");

export default function ReviewsView({ userId }: { userId: string; }) {
    const [reviews, _, isLoading, refetch] = useAwaiter(() => getReviews(userId), []);

    if (isLoading) return null;

    function onKeyPress({ key, target }: KeyboardEvent<HTMLTextAreaElement>) {
        if (key === "Enter") {
            addReview({
                userid: userId,
                comment: (target as HTMLInputElement).value,
                star: -1
            }).then(res => {
                if (res === 0 || res === 1) {
                    (target as HTMLInputElement).value = ""; // clear the input
                    refetch();
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
                    refetch={refetch}
                />
            )}
            {reviews?.length === 0 && (
                <Forms.FormText style={{ padding: "12px", paddingTop: "0px", paddingLeft: "4px", fontWeight: "bold", fontStyle: "italic" }}>
                    Looks like nobody reviewed this user yet. You could be the first!
                </Forms.FormText>
            )}
            <textarea
                className={classes(Classes.textarea.replace("textarea", ""),"enter-comment")}
                // this produces something like '-_59yqs ...' but since no class exists with that name its fine
                placeholder= {"Review @" + UserStore.getUser(userId)?.username ?? ""}
                onKeyDown={onKeyPress}
                style={{
                    marginTop: "6px",
                    resize: "none",
                    marginBottom: "12px",

                    padding: "12px",
                    marginBottom: "12px",
                    color: "var(--text-normal)",
                    border: "1px solid var(--profile-message-input-border-color)",
                    fontSize: "14px",
                    borderRadius: "3px",
                }}
            />
        <div/>
    );

}
