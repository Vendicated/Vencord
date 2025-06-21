/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "xdgGlobalKeybinds",
    description:
        "Adds support for global shortcuts for linux using xdg-desktop-portal. This is espically useful for Vesktop users who want to use global keybinds and/or Hyprland users.",
    authors: [Devs.khald0r],
});
