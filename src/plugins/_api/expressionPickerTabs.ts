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
            find: "#{intl::EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL}",
            replacement: [
                {
                    match: /\.jsx\)\((\i),\{id:\i\.E\i,.+?,"aria-selected":(\i)===\i\.\i\.EMOJI.+?,viewType:(\i).{0,50}\}\)/,
                    replace: "$&,...Vencord.Api.ExpressionPickerTabs.RenderTabButtons($1, $2)"
                },
                {
                    match: /null,(\i)===\i\.\i\.SOUNDBOARD\?.{0,95}channel:(\i),containerWidth:(\i).+?\):null/,
                    replace: "$&,...Vencord.Api.ExpressionPickerTabs.TabPanels($1, $2, $3)"
                }
            ]
        }
    ]
});
