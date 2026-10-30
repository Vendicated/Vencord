/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel as OriginalChannel, User as OriginalUser } from "discord-types/general";

import type { TAGS } from "./tag";

export type Channel = {
    isForumPost(): boolean;
    isGroupDM(): boolean;
} & OriginalChannel;

export type User = {
    isClyde(): boolean;
    isVerifiedBot(): boolean;
} & OriginalUser;

export type CSSHex = `#${string}`;

type ColoredTagName = keyof Omit<typeof TAGS, "CLYDE" | "AUTOMOD" | "OFFICIAL">;
type CustomColoredTagName = Exclude<ColoredTagName, "THREAD_CREATOR" | "POST_CREATOR" | "GROUP_OWNER" | "GUILD_OWNER">;

export type ColoredTag = (typeof TAGS)[ColoredTagName];
export type CustomColoredTag = (typeof TAGS)[CustomColoredTagName];

export type TagColors = Record<ColoredTag, CSSHex>;
