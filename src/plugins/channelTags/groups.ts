/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type GroupName = string & { _brand: "group"; };
export type Group = Record<never, never>;
export type GroupMap = Record<GroupName, Group>;

export const DEFAULT_GROUP: Group = {};

export const toGroupName = (name: string) => name.trim() as GroupName;
