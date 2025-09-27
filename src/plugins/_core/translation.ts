/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { setLocale, t } from "@utils/translation";
import definePlugin from "@utils/types";
import { i18n } from "@webpack/common";

export default definePlugin({
    name: "Translation",
    required: true,
    description: t("translation.description"),
    authors: [Devs.lewisakura],

    flux: {
        USER_SETTINGS_PROTO_UPDATE({ settings }) {
            setLocale(settings.proto.localization.locale.value);
        }
    },

    start() {
        setLocale(i18n.intl.currentLocale);
    }
});
