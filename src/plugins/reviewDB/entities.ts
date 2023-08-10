/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const enum UserType {
    Banned = -1,
    Normal = 0,
    Admin = 1
}

export const enum ReviewType {
    User = 0,
    Server = 1,
    Support = 2,
    System = 3
}

export interface Badge {
    name: string;
    description: string;
    icon: string;
    redirectURL: string;
    type: number;
}

export interface BanInfo {
    id: string;
    discordID: string;
    reviewID: number;
    reviewContent: string;
    banEndDate: number;
}

export interface ReviewDBUser {
    ID: number;
    discordID: string;
    username: string;
    profilePhoto: string;
    clientMod: string;
    warningCount: number;
    badges: any[];
    banInfo: BanInfo | null;
    lastReviewID: number;
    type: UserType;
}

export interface ReviewAuthor {
    id: number,
    discordID: string,
    username: string,
    profilePhoto: string,
    badges: Badge[];
}

export interface Review {
    comment: string,
    id: number,
    star: number,
    sender: ReviewAuthor,
    timestamp: number;
    type?: ReviewType;
}
