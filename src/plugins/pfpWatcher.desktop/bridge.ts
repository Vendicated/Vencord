/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 notjacobwashere and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginNative } from "@utils/types";

export const Native = VencordNative.pluginHelpers.PfpWatcher as PluginNative<typeof import("./native")>;
