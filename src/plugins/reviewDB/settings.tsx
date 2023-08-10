/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { ReviewDBUser } from "./entities";
import { authorize } from "./utils";

export const settings = definePluginSettings({
    authorize: {
        type: OptionType.COMPONENT,
        description: "Authorize with ReviewDB",
        component: () => (
            <Button onClick={authorize}>
                Authorize with ReviewDB
            </Button>
        )
    },
    notifyReviews: {
        type: OptionType.BOOLEAN,
        description: "Notify about new reviews on startup",
        default: true,
    },
    showWarning: {
        type: OptionType.BOOLEAN,
        description: "Display warning to be respectful at the top of the reviews list",
        default: true,
    },
    hideTimestamps: {
        type: OptionType.BOOLEAN,
        description: "Hide timestamps on reviews",
        default: false,
    },
    hideBlockedUsers: {
        type: OptionType.BOOLEAN,
        description: "Hide reviews from blocked users",
        default: true,
    },
    website: {
        type: OptionType.COMPONENT,
        description: "ReviewDB website",
        component: () => (
            <Button onClick={() => {
                let url = "https://reviewdb.mantikafasi.dev/";
                if (settings.store.token)
                    url += "/api/redirect?token=" + encodeURIComponent(settings.store.token);

                VencordNative.native.openExternal(url);
            }}>
                ReviewDB website
            </Button>
        )
    },
    supportServer: {
        type: OptionType.COMPONENT,
        description: "ReviewDB Support Server",
        component: () => (
            <Button onClick={() => {
                VencordNative.native.openExternal("https://discord.gg/eWPBSbvznt");
            }}>
                ReviewDB Support Server
            </Button>
        )
    }
}).withPrivateSettings<{
    token?: string;
    user?: ReviewDBUser;
    lastReviewId?: number;
    reviewsDropdownState?: boolean;
}>();
