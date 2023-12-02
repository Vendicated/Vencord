/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { authorize, getToken } from "./auth";

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
            <Button onClick={async () => {
                let url = "https://reviewdb.mantikafasi.dev/";
                const token = await getToken();
                if (token)
                    url += "/api/redirect?token=" + encodeURIComponent(token);

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
    lastReviewId?: number;
    reviewsDropdownState?: boolean;
}>();
