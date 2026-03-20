/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const cl = classNameFactory("vc-char-counter-");

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Turn on or off color effects for getting close to the character limit",
        default: true,
    },
});

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [EquicordDevs.creations, EquicordDevs.Panniku, Devs.thororen],
    settings,
    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: [
                {
                    match: /(textValue:.{0,50}channelId:\i\.id\}\),)\i/,
                    replace: "$1$self.renderCharCounter(arguments[0].textValue)"
                }
            ]
        },
        {
            find: "#{intl::PREMIUM_MESSAGE_LENGTH_UPSELL_TOOLTIP}",
            replacement: {
                match: /return \i\?\i\(\):\i\(\)/,
                replace: "return null"
            }
        }
    ],
    renderCharCounter: ErrorBoundary.wrap(text => {
        const premiumType = (UserStore.getCurrentUser()?.premiumType ?? 0);
        const charMax = premiumType === 2 ? 4000 : 2000;
        const { length } = text;

        let color = "var(--primary-330)";
        if (settings.store.colorEffects) {
            const percentage = (length / charMax) * 100;
            if (percentage < 50) color = "var(--text-muted)";
            else if (percentage < 75) color = "var(--yellow-330)";
            else if (percentage < 90) color = "var(--orange-330)";
            else color = "var(--red-360)";
        }

        if (!length) return null;
        return (
            <div className={cl("counter")} style={{ color }}>
                <span className={cl("count")} >{length}</span>/
                <span className={cl("max")} >{charMax}</span>
            </div>
        );
    }, { noop: true })
});
