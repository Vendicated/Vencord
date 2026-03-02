/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import declutter from "@equicordplugins/declutter";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findCssClassesLazy } from "@webpack";

const { iconForeground } = findCssClassesLazy("iconForeground", "accountPopoutButtonWrapper");

export default definePlugin({
    name: "UserAreaAPI",
    description: "API to add buttons to the user area panel.",
    authors: [Devs.prism],

    patches: [
        {
            find: ".WIDGETS_RTC_UPSELL_COACHMARK),",
            replacement: [
                {
                    match: /(?<=className:(\i)\.\i,style:\i,)children:\[/,
                    replace: "children:[...$self.renderButtons(arguments[0],$1),"
                },
                // fix discord weird shrink with extra buttons
                {
                    match: /(?<=\{ref:\i,)style:(\i)/,
                    replace: "style:{...$1,minWidth:0}"
                }
            ]
        }
    ],

    renderButtons(props: { nameplate?: any; }) {
        return Vencord.Api.UserArea._renderButtons({
            nameplate: props.nameplate,
            iconForeground: props.nameplate != null ? iconForeground : void 0,
            hideTooltips: this.shouldHideTooltips()
        });
    },

    shouldHideTooltips() {
        return isPluginEnabled(declutter.name) && declutter.settings.store.removeButtonTooltips;
    }
});
