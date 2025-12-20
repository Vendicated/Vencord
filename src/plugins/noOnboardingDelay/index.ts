/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoOnboardingDelay",
    description: "Skips the slow and annoying onboarding delay",
    authors: [Devs.nekohaxx],
    patches: [
        {
            find: "#{intl::ONBOARDING_COVER_WELCOME_SUBTITLE}",
            replacement: {
                match: "3e3",
                replace: "0"
            },
        },
    ],
});
