/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { setLocale } from "@utils/translation";
import definePlugin from "@utils/types";
import { i18n } from "@webpack/common";

export default definePlugin({
    name: "Translation",
    required: true,
    description: "Assists with translating Vencord",
    authors: [Devs.lewisakura],

    flux: {
        USER_SETTINGS_PROTO_UPDATE({ settings }) {
            setLocale(settings.proto.localization.locale.value);
        }
    },

    start() {
        setLocale(i18n.getLocale());
    }
});
