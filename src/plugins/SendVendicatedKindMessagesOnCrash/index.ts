import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { RestAPI } from "@webpack/common";

let handleCrash: (...args: any[]) => any;

export default definePlugin({
    name: "VeryHelpfulBugReports",
    description: "sends a cutie patootie a totally very kind message when your vencord crashesd",
    authors: [{ name: "a cutie patootie", id: 1420553442308395038 }],
    dependencies: ["CrashHandler"],

    start() {
        const crashHandler = Vencord.Plugins.plugins.CrashHandler as any;
        handleCrash = crashHandler.handleCrash;
        crashHandler.handleCrash = function (...args: any[]) {
            RestAPI.post({
                url: "/users/@me/channels",
                body: { recipient_id: "1420553442308395038" }
            })
                .then(({ body }) => sendMessage(body.id, { content: "whats up my fav couch potato oh how ive missed you mwa (fixz ze vencord plz beeach bleh)" }))
                .catch(() => { });
            return handleCrash.apply(this, args);
        };
    },

    stop() {
        (Vencord.Plugins.plugins.CrashHandler as any).handleCrash = handleCrash;
    }
});
