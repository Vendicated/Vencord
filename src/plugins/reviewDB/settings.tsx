/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { authorize, getToken } from "./auth";
import { openBlockModal } from "./components/BlockedUserModal";
import { cl } from "./utils";

export const settings = definePluginSettings({
    authorize: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => authorize()}>
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
    buttons: {
        type: OptionType.COMPONENT,
        component: () => (
            <div className={cl("button-grid")} >
                <Button onClick={openBlockModal}>Manage Blocked Users</Button>

                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        VencordNative.native.openExternal("https://github.com/sponsors/mantikafasi");
                    }}
                >
                    Support ReviewDB development
                </Button>

                <Button onClick={async () => {
                    let url = "https://reviewdb.mantikafasi.dev";
                    const token = await getToken();
                    if (token)
                        url += "/api/redirect?token=" + encodeURIComponent(token);

                    await VencordNative.native.openExternal(url);
                }}>
                    ReviewDB website
                </Button>


                <Button onClick={() => {
                    VencordNative.native.openExternal("https://discord.gg/eWPBSbvznt");
                }}>
                    ReviewDB Support Server
                </Button>
            </div >
        )
    }
}).withPrivateSettings<{
    lastReviewId?: number;
    reviewsDropdownState?: boolean;
}>();
