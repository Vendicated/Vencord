/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { availableLocales, setLocale, t } from "@utils/translation";
import definePlugin, { OptionType } from "@utils/types";
import { i18n } from "@webpack/common";

const settings = definePluginSettings({
    forceLocale: {
        type: OptionType.SELECT,
        description: t("translation.settings.forceLocale.description"),
        options: [
            {
                label: t("translation.settings.forceLocale.followDiscord"),
                value: "",
                default: true,
            },
            ...availableLocales.map(l => ({
                label: l,
                value: l
            }))
        ],
        onChange: (value: string) => {
            setLocale(value || i18n.intl.currentLocale);
        }
    }
});

export default definePlugin({
    name: "Translation",
    required: true,
    description: t("translation.description"),
    authors: [Devs.lewisakura],

    settings,

    flux: {
        USER_SETTINGS_PROTO_UPDATE({ settings }) {
            if (settings.proto.localization) // sometimes this apparently doesn't exist? not sure why
                setLocale(settings.proto.localization.locale.value);
        }
    },

    start() {
        setLocale(i18n.intl.currentLocale);
    }
});
