/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import CategoryManager from "./components/CategoryManager";

export const settings = definePluginSettings({
    autoFavorite: {
        type: OptionType.BOOLEAN,
        description: "When adding a gif to a category, also add it to native favorites (not yet implemented)",
        default: true,
    },
    autoUnfavorite: {
        type: OptionType.BOOLEAN,
        description: "When removing a gif from its last category, also remove it from native favorites (not yet implemented)",
        default: false,
    },
    manageCategories: {
        type: OptionType.COMPONENT,
        component: () => <CategoryManager />,
    },
});
