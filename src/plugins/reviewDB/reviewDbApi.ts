/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Review, ReviewDBUser } from "./entities";
import { settings } from "./settings";
import { authorize, showToast } from "./utils";

const API_URL = "https://manti.vendicated.dev";

export const REVIEWS_PER_PAGE = 50;

export interface Response {
    success: boolean,
    message: string;
    reviews: Review[];
    updated: boolean;
    hasNextPage: boolean;
    reviewCount: number;
}

const WarningFlag = 0b00000010;

export async function getReviews(id: string, offset = 0): Promise<Response> {
    let flags = 0;
    if (!settings.store.showWarning) flags |= WarningFlag;

    const params = new URLSearchParams({
        flags: String(flags),
        offset: String(offset)
    });
    const req = await fetch(`${API_URL}/api/reviewdb/users/${id}/reviews?${params}`);

    const res = (req.status === 200)
        ? await req.json() as Response
        : {
            success: false,
            message: "An Error occured while fetching reviews. Please try again later.",
            reviews: [],
            updated: false,
            hasNextPage: false,
            reviewCount: 0
        };

    if (!res.success) {
        showToast(res.message);
        return {
            ...res,
            reviews: [
                {
                    id: 0,
                    comment: "An Error occured while fetching reviews. Please try again later.",
                    star: 0,
                    timestamp: 0,
                    sender: {
                        id: 0,
                        username: "Error",
                        profilePhoto: "https://cdn.discordapp.com/attachments/1045394533384462377/1084900598035513447/646808599204593683.png?size=128",
                        discordID: "0",
                        badges: []
                    }
                }
            ]
        };
    }

    return res;
}

export async function addReview(review: any): Promise<Response | null> {
    review.token = settings.store.token;

    if (!review.token) {
        showToast("Please authorize to add a review.");
        authorize();
        return null;
    }

    return fetch(API_URL + `/api/reviewdb/users/${review.userid}/reviews`, {
        method: "PUT",
        body: JSON.stringify(review),
        headers: {
            "Content-Type": "application/json",
        }
    })
        .then(r => r.json())
        .then(res => {
            showToast(res.message);
            return res ?? null;
        });
}

export function deleteReview(id: number): Promise<Response> {
    return fetch(API_URL + `/api/reviewdb/users/${id}/reviews`, {
        method: "DELETE",
        headers: new Headers({
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        body: JSON.stringify({
            token: settings.store.token,
            reviewid: id
        })
    }).then(r => r.json());
}

export async function reportReview(id: number) {
    const res = await fetch(API_URL + "/api/reviewdb/reports", {
        method: "PUT",
        headers: new Headers({
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        body: JSON.stringify({
            reviewid: id,
            token: settings.store.token
        })
    }).then(r => r.json()) as Response;

    showToast(res.message);
}

export function getCurrentUserInfo(token: string): Promise<ReviewDBUser> {
    return fetch(API_URL + "/api/reviewdb/users", {
        body: JSON.stringify({ token }),
        method: "POST",
    }).then(r => r.json());
}
