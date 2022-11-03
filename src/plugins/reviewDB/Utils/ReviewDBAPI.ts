import { Settings } from "../../../Vencord";
import { Toasts } from "../../../webpack/common";
import { Review } from "../entities/Review";
import { authorize, showToast } from "./Utils";


const settings = Settings.plugins.ReviewDB;

const API_URL = "https://manti.vendicated.dev";

export const getReviews = async (discorid: string): Promise<Review[]> => {
    const res = await fetch("https://manti.vendicated.dev/getUserReviews?snowflakeFormat=string&discordid=" + discorid.toString());
    return await res.json() as Review[];
};

export const addReview = async (review: any): Promise<number> => {
    let token = settings.token;
    if (token === "") {
        authorize();

        Toasts.show({
            message: "Please authorize to add a review.", options: { position: 1 },
            id: "",
            type: 0
        });

        return 2;
    }
    review["token"] = token;

    return await fetch(API_URL + "/addUserReview", { method: "POST", body: JSON.stringify(review) }).then(r => r.text()).then(
        res => {
            Toasts.show({
                message: res, options: { position: 1 },
                id: "",
                type: 0
            });

            let responseCode = 0;
            // 0 means added ,1 means edited, 2 means error
            if (res === "Added your review") {
                responseCode = 0;
            } else if (res === "Updated your review") {
                responseCode = 1;
            } else {
                responseCode = 2;
            }
            return responseCode;
        }
    );
};

export const deleteReview = async (reviewid: string): Promise<any> => {
    let data: any = {
        "token": settings.get("token", ""),
        "reviewid": reviewid
    };
    return await fetch(API_URL + "/deleteReview", { method: "POST", body: JSON.stringify(data) }).then(r => r.json());
};

export const reportReview = (reviewID: string) => {
    let data: any = {
        "reviewid": reviewID,
        "token": settings.get("token", "")
    };
    fetch(API_URL + "/reportReview", { method: "POST", body: JSON.stringify(data) }).then(r => r.text()).then(res => showToast(res));
};

export const getLastReviewID = async (userid: string): Promise<number> => {
    return await fetch(API_URL + "/getLastReviewID?discordid=" + userid).then(r => r.text()).then(r => Number.parseInt(r));
}

