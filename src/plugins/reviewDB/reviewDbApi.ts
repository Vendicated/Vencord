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

import { Toasts } from "@webpack/common";

import { Auth, authorize, getToken, updateAuth } from "./auth";
import { Review, ReviewDBCurrentUser, ReviewDBUser, ReviewType } from "./entities";
import { settings } from "./settings";
import { showToast } from "./utils";

const API_URL = "https://manti.vendicated.dev/api/reviewdb";

export const REVIEWS_PER_PAGE = 50;

export interface Response {
    message: string;
    reviews: Review[];
    updated: boolean;
    hasNextPage: boolean;
    reviewCount: number;
}

const WarningFlag = 0b00000010;

async function rdbRequest(path: string, options: RequestInit = {}) {
    return fetch(API_URL + path, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: await getToken() || "",
        }
    });
}

export async function getReviews(id: string, offset = 0): Promise<Response> {
    let flags = 0;
    if (!settings.store.showWarning) flags |= WarningFlag;

    const params = new URLSearchParams({
        flags: String(flags),
        offset: String(offset)
    });
    const req = await fetch(`${API_URL}/users/${id}/reviews?${params}`);

    const res = (req.ok)
        ? await req.json() as Response
        : {
            message: req.status === 429 ? "You are sending requests too fast. Wait a few seconds and try again." : "An Error occured while fetching reviews. Please try again later.",
            reviews: [],
            updated: false,
            hasNextPage: false,
            reviewCount: 0
        };

    if (!req.ok) {
        showToast(res.message, Toasts.Type.FAILURE);
        return {
            ...res,
            reviews: [
                {
                    id: 0,
                    comment: res.message,
                    star: 0,
                    timestamp: 0,
                    type: ReviewType.System,
                    sender: {
                        id: 0,
                        username: "ReviewDB",
                        profilePhoto: "https://cdn.discordapp.com/avatars/1134864775000629298/3f87ad315b32ee464d84f1270c8d1b37.png?size=256&format=webp&quality=lossless",
                        discordID: "1134864775000629298",
                        badges: []
                    }
                }
            ]
        };
    }

    return res;
}

export async function addReview(review: any): Promise<Response | null> {

    const token = await getToken();
    if (!token) {
        showToast("Please authorize to add a review.");
        authorize();
        return null;
    }

    return await rdbRequest(`/users/${review.userid}/reviews`, {
        method: "PUT",
        body: JSON.stringify(review),
        headers: {
            "Content-Type": "application/json",
        }
    }).then(async r => {
        const data = await r.json() as Response;
        showToast(data.message);
        return r.ok ? data : null;
    });
}

export async function deleteReview(id: number): Promise<Response | null> {
    return await rdbRequest(`/users/${id}/reviews`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            reviewid: id
        })
    }).then(async r => {
        const data = await r.json() as Response;
        showToast(data.message);
        return r.ok ? data : null;
    });
}

export async function reportReview(id: number) {
    const res = await rdbRequest("/reports", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            reviewid: id,
        })
    }).then(r => r.json()) as Response;

    showToast(res.message);
}

async function patchBlock(action: "block" | "unblock", userId: string) {
    const res = await rdbRequest("/blocks", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            action: action,
            discordId: userId
        })
    });

    if (!res.ok) {
        showToast(`Failed to ${action} user`, Toasts.Type.FAILURE);
    } else {
        showToast(`Successfully ${action}ed user`, Toasts.Type.SUCCESS);

        if (Auth?.user?.blockedUsers) {
            const newBlockedUsers = action === "block"
                ? [...Auth.user.blockedUsers, userId]
                : Auth.user.blockedUsers.filter(id => id !== userId);
            updateAuth({ user: { ...Auth.user, blockedUsers: newBlockedUsers } });
        }
    }
}

export const blockUser = (userId: string) => patchBlock("block", userId);
export const unblockUser = (userId: string) => patchBlock("unblock", userId);

export async function fetchBlocks(): Promise<ReviewDBUser[]> {
    const res = await rdbRequest("/blocks", {
        method: "GET",
        headers: {
            Accept: "application/json",
        }
    });

    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
}

export function getCurrentUserInfo(token: string): Promise<ReviewDBCurrentUser> {
    return rdbRequest("/users", {
        method: "POST",
    }).then(r => r.json());
}

export async function readNotification(id: number) {
    return rdbRequest(`/notifications?id=${id}`, {
        method: "PATCH"
    });
}
