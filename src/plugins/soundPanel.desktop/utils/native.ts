/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";

export const Native = VencordNative.pluginHelpers.SoundPanel as PluginNative<typeof import("../native")> | undefined;
