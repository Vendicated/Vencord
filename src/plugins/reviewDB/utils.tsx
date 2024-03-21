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

import { classNameFactory } from "@api/Styles";
import { Toasts, UserStore } from "@webpack/common";

import { Auth } from "./auth";
import { Review, UserType } from "./entities";

export const cl = classNameFactory("vc-rdb-");

export function canDeleteReview(profileId: string, review: Review) {
    const myId = UserStore.getCurrentUser().id;
    return (
        myId === profileId
        || review.sender.discordID === myId
        || Auth.user?.type === UserType.Admin
    );
}

export function canBlockReviewAuthor(profileId: string, review: Review) {
    const myId = UserStore.getCurrentUser().id;
    return profileId === myId && review.sender.discordID !== myId;
}

export function canReportReview(review: Review) {
    return review.sender.discordID !== UserStore.getCurrentUser().id;
}

export function showToast(message: string, type = Toasts.Type.MESSAGE) {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type,
        options: {
            position: Toasts.Position.BOTTOM, // NOBODY LIKES TOASTS AT THE TOP
        },
    });
}
