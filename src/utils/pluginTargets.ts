/*
 * Claudecord, a Discord client mod
 * Copyright (c) 2026 Vendicated, Claude and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const PluginTargets = ["web", "browser", "discordDesktop", "vesktop", "desktop", "dev"] as const;
export type PluginTarget = typeof PluginTargets[number];
