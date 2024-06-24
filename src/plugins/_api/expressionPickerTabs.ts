/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ExpressionPickerTabsAPI",
    description: "an API to add panels to the expression picker",
    authors: [Devs.iamme],
    patches: [
        {
            find: ".EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL",
            replacement: [
                {
                    match: /\.jsx\)\((\i),\{id:\i\.E\i,.+?,"aria-selected":(\i)===\i\.\i\.EMOJI.+?,viewType:(\i).+?\}\)/,
                    replace: "$&,...Vencord.Api.ExpressionPickerTabs.RenderTabButtons($1, $2)"
                },
                {
                    match: /null,(\i)===\i\.\i\.EMOJI\?.{0,55}channel:(\i),.+?\):null/,
                    replace: "$&,...Vencord.Api.ExpressionPickerTabs.TabPanels($1, $2)"
                }
            ]
        }
    ]
});
