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

import { User } from "discord-types/general";

import ErrorBoundary from "../../components/ErrorBoundary";
import { Devs } from "../../utils/constants";
import definePlugin, { OptionType } from "../../utils/types";
import { Settings } from "../../Vencord";
import { Button, UserStore } from "../../webpack/common";
import ReviewsView from "./components/ReviewsView";
import { getLastReviewID } from "./Utils/ReviewDBAPI";
import { showToast } from "./Utils/Utils";

export default definePlugin({
    name: "ReviewDB",
    description: "See reviews of other people",
    authors: [Devs.mantikafasi, Devs.Ven],

    patches: [
        {
            find: "disableBorderColor:!0",
            replacement: {
                match: /\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,Vencord.Plugins.plugins.ReviewDB.getReviewsComponent($1)"
            },
        }
    ],

    options: {
        notifyReviews: {
            type: OptionType.BOOLEAN,
            description: "Notify about new reviews on startup",
            default: true,
        },
        token: {
            type: OptionType.STRING,
            description: "Your OAUTH token for the ReviewDB API",
            default: "",
        },
        authorize: {
            type: OptionType.COMPONENT,
            description: "Authorize your account",
            component: () => (
                <Button onClick={() =>
                    window.open("https://discord.com/api/oauth2/authorize?client_id=915703782174752809&redirect_uri=https%3A%2F%2Fmanti.vendicated.dev%2FURauth&response_type=code&scope=identify")
                }>
                    Get OAUTH2 Token
                </Button>
            )
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
