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

import { Settings } from "../../../Vencord";
import { Review } from "../entities/Review";
import { authorize, showToast } from "./Utils";

const settings = Settings.plugins.ReviewDB;
const API_URL = "https://manti.vendicated.dev";

enum Response {
    "Added your review" = 0,
    "Updated your review" = 1,
    "Error" = 2,
}

export async function getReviews(id: string): Promise<Review[]> {
    const res = await fetch(API_URL + "/getUserReviews?snowflakeFormat=string&discordid=" + id);
    return await res.json() as Review[];
}

export async function addReview(review: any): Promise<Response> {
    review.token = settings.token;

    if (!review.token) {
        showToast("Please authorize to add a review.");
        authorize();
        return Response.Error;
    }

    return fetch(API_URL + "/addUserReview", {
        method: "POST",
        body: JSON.stringify(review),
        headers: {
            "Content-Type": "application/json",
        }
    })
        .then(r => r.text())
        .then(
            res => {
                showToast(res);

                return res in Response
                    ? Response[res]
                    : Response.Error;
            }
        );
}

export function deleteReview(id: number): Promise<any> {
    return fetch(API_URL + "/deleteReview", {
        method: "POST",
        headers: new Headers({
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        body: JSON.stringify({
            token: settings.token,
            reviewid: id
        })
    }).then(r => r.json());
}

export async function reportReview(id: number) {
    const res = await fetch(API_URL + "/reportReview", {
        method: "POST",
        headers: new Headers({
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        body: JSON.stringify({
            reviewid: id,
            token: settings.token
        })
    });
    showToast(await res.text());
}

export function getLastReviewID(id: string): Promise<number> {
    return fetch(API_URL + "/getLastReviewID?discordid=" + id)
        .then(r => r.text())
        .then(Number);
}
