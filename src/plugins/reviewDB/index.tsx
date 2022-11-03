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

import { Devs } from "../../utils/constants";
import definePlugin, { OptionType } from "../../utils/types";
import { Settings } from "../../Vencord";
import { Button, React, UserStore } from "../../webpack/common";
import { showToast } from "./Utils/Utils";

export default definePlugin({
    name: "ReviewDB",
    description: "See reviews of other people",
    authors: [Devs.mantikafasi],
    patches: [
        {
            find: "disableBorderColor:!0",
            replacement: {
                match: /createElement\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,Vencord.Plugins.plugins.ReviewDB.getReviewsComponent($1)"
            },
        }
    ],
    options: {
        "notifyReviews": { type: OptionType.BOOLEAN, default: true, description: "Notify you when someone reviews you" },
        "token": { type: OptionType.STRING, default: "", description: "Your token for ReviewDB API" }, "authorize": {
            type: OptionType.COMPONENT, component: () => {
                return <Button onClick={() =>
                    window.open("https://discord.com/api/oauth2/authorize?client_id=915703782174752809&redirect_uri=https%3A%2F%2Fmanti.vendicated.dev%2FURauth&response_type=code&scope=identify")
                }>Get OAUTH2 Token</Button>;
            }, description: "Authorize your account"
        }
    },

    async start() {
        this.ReviewsView = await import("./components/ReviewsView");
        this.getLastReviewID = (await import("./Utils/ReviewDBAPI")).getLastReviewID;


        console.log("ReviewDB Started");

        const settings = Settings.plugins.ReviewDB;

        settings.get = (key: string) => settings[key];
        settings.set = (key: string, value: any) => settings[key] = value;


        this.getLastReviewID(UserStore.getCurrentUser().id).then(lastreviewid => {
            const storedLastReviewID: number = settings.get("lastreviewid", 0);
            if (settings.get("notifyReviews", true) && storedLastReviewID < lastreviewid) {
                if (storedLastReviewID !== 0) {
                    showToast("You have new reviews on your profile");
                }

                settings.set("lastreviewid", lastreviewid);
            }
        });

    },

    getReviewsComponent(user) {
        return (
            <this.ReviewsView.default userid={user.id.toString()} />
        );
    }
});
