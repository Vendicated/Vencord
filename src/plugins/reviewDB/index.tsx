/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import ReviewsView from "./components/ReviewsView";
import { getLastReviewID } from "./Utils/ReviewDBAPI";
import { authorize, showToast } from "./Utils/Utils";

export default definePlugin({
    name: "ReviewDB",
    description: "Review other users (Adds a new settings to profiles)",
    authors: [Devs.mantikafasi, Devs.Ven],

    patches: [
        {
            find: "disableBorderColor:!0",
            replacement: {
                match: /\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            },
        }
    ],

    options: {
        authorize: {
            type: OptionType.COMPONENT,
            description: "Authorise with ReviewDB",
            component: () => (
                <Button onClick={authorize}>
                    Authorise with ReviewDB
                </Button>
            )
        },
        notifyReviews: {
            type: OptionType.BOOLEAN,
            description: "Notify about new reviews on startup",
            default: true,
        }
    },

    async start() {
        const settings = Settings.plugins.ReviewDB;
        if (!settings.lastReviewId || !settings.notifyReviews) return;

        setTimeout(async () => {
            const id = await getLastReviewID(UserStore.getCurrentUser().id);
            if (settings.lastReviewId < id) {
                showToast("You have new reviews on your profile!");
                settings.lastReviewId = id;
            }
        }, 4000);
    },

    getReviewsComponent: (user: User) => (
        <ErrorBoundary message="Failed to render Reviews">
            <ReviewsView userId={user.id} />
        </ErrorBoundary>
    )
});
