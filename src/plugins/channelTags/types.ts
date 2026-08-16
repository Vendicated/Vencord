/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GroupName } from "./groups";
import { valuesOf } from "./object";

export type TagId = string & { _brand: "tagId"; };
export type ChannelId = string & { _brand: "channelId"; };
export type GuildId = string & { _brand: "guildId"; };
export type UserId = string & { _brand: "userId"; };

export interface ChannelTag {
    name: string;
    color: string;
    group?: GroupName;
    shape?: TagShape;
}

export const TagShapes = {
    Circle: "circle",
    Triangle: "triangle",
    Square: "square",
    Spark: "spark",
    Star: "star",
    Heart: "heart",
    Pin: "pin"
} as const;
export type TagShape = (typeof TagShapes)[keyof typeof TagShapes];
export const TagShapesList = valuesOf(TagShapes);
export const DEFAULT_TAG_SHAPE = TagShapes.Circle;

export type TagMap = Partial<Record<TagId, ChannelTag>>;
export type UserDMChannelMap = Partial<Record<UserId, ChannelId>>;
export type ChannelTagMap = Partial<Record<ChannelId, TagId[]>>;
