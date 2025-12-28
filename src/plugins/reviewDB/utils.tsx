/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
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
