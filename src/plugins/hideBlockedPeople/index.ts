import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let interval: NodeJS.Timeout;
export default definePlugin({
    name: "hideBlockedPeople",
    description: "Completely hide the blocked people like they doesn't exist",
    authors: [Devs.rhaymDev],
    start() {
        const divs = document.querySelectorAll("div[class='groupStart__56db5']");
        divs.forEach((div) => {
            if (div instanceof HTMLElement) {
                div.style.display = "none";
            }
        });
        interval = setInterval(() => {
            const divs = document.querySelectorAll("div[class='groupStart__56db5']");
            divs.forEach((div) => {
                if (div instanceof HTMLElement) {
                    div.style.display = "none";
                }
            });
        }, 0);
    },
    stop() {
        clearInterval(interval);
        const divs = document.querySelectorAll("div[class='groupStart__56db5']");
        divs.forEach((div) => {
            if (div instanceof HTMLElement) {
                div.style.display = 'block';
            }
        });
    },
});
