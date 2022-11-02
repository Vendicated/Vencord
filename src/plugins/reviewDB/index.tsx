
//import ReviewDBSettings from "./components/Settings";
//import { patcher } from "ittai";
import { showToast, sleep } from "./Utils/Utils";
import definePlugin, { OptionType } from "../../utils/types";
import { Button, React, UserStore } from "../../webpack/common";
import { Settings } from "../../Vencord";
import { Logger } from "../../utils";

export default definePlugin({
    name: "ReviewDB",
    description: "See reviews of other people",
    authors: [{
        name: "mantikafasi",
        id: 287555395151593473n
    }],
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
        do {

            var currentUser = UserStore.getCurrentUser();
            if (!currentUser) await sleep(3000);
        } while (!currentUser);

        const settings = Settings.plugins.ReviewDB;

        settings.get = (key: string) => settings[key];
        settings.set = (key: string, value: any) => settings[key] = value;


        this.getLastReviewID(UserStore.getCurrentUser().id).then(lastreviewid => {
            const storedLastReviewID: number = settings.get("lastreviewid", 0);
            if (settings.get("notifyReviews", true) && storedLastReviewID < lastreviewid) {
                if (storedLastReviewID != 0) {
                    showToast("You have new reviews on your profile");
                }

                settings.set("lastreviewid", lastreviewid);
            }
        });

        //this.setSettingsPanel(() => React.createElement(ReviewDBSettings));
    },
    //
    getReviewsComponent(user) {
        return (
            <this.ReviewsView.default userid={user.id.toString()} />
        );
    }
});