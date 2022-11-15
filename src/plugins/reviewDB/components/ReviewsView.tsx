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

import { LazyComponent, useAwaiter } from "../../../utils/misc";
import { bulk, filters } from "../../../webpack";
import { Forms, TextInput } from "../../../webpack/common";
import { addReview, getReviews } from "../Utils/ReviewDBAPI";
import ReviewComponent from "./ReviewComponent";

export default LazyComponent(() => {
    const p = filters.byProps;
    const [
        { eyebrow },
        { bodyTitle },
        { section }
    ] = bulk(
        p("eyebrow"),
        p("bodyTitle"),
        p("section", "lastSection")
    );

    return function ReviewsView({ userId }: { userId: string; }) {
        const [reviews, _, isLoading] = useAwaiter(() => getReviews(userId), []);

        function onKeyPress(keyEvent: any) {
            if (keyEvent.key === "Enter") {
                addReview({
                    userid: userId,
                    comment: keyEvent.target.value,
                    star: -1
                }).then(res => {
                    if (res === 0 || res === 1) {
                        keyEvent.target.value = ""; // clear the input
                        fetchReviews();
                    }
                });
            }
        }

        return (
            <div>
                <h3 className={eyebrow + " " + bodyTitle + " " + section}
                    style={{ color: "var(--header-secondary)" }}>User Reviews</h3>
                {
                    (reviews) ? (reviews.map(review => {
                        return <ReviewComponent fetchReviews={fetchReviews} review={review} />;
                    })) : (<div><br></br></div>)
                }
                {reviews?.length === 0 && (
                    <Forms.FormSection tag="h2">Looks like nobody reviewed this user, yet you can be the first!</Forms.FormSection>
                )}
                <TextInput
                    placeholder="Enter a comment"
                    onKeyPress={onKeyPress}
                />
            </div>
        );
    };
});
