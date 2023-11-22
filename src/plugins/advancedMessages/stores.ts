/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type AllowedMentionsParsables = "everyone" | "users" | "roles";

export interface AllowedMentions {
    parse: Set<AllowedMentionsParsables>,
    users?: Set<string>,
    roles?: Set<string>,
    repliedUser: boolean,
    meta: {
        hasEveryone: boolean,
        isEdit: boolean,
        isReply: boolean,
        userIds: Set<string>,
        roleIds: Set<string>;
    };
}

export interface EditAttachments {
    messageId: string,
    attachments: File[];
}

export const SendAllowedMentionsStore = new Map<string, AllowedMentions>();
export const EditAllowedMentionsStore = new Map<string, AllowedMentions>();
export const EditAttachmentsStore = new Map<string, EditAttachments>();

