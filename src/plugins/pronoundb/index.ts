import definePlugin from "../../utils/types";
import PronounComponent from "./PronounComponent";
import { fetchPronouns } from "./utils";

export default definePlugin({
    name: "PronounDB",
    authors: [{
        name: "Tyman",
        id: 487443883127472129n
    }],
    description: "Adds pronouns to user messages using pronoundb",
    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(?<=return\s+\w{1,3}\.createElement\(.+!\w{1,3}&&)(\w{1,3}.createElement\(.+?\{.+?\}\))/,
                replace: "[$1, Vencord.Plugins.plugins.PronounDB.PronounComponent(e)]"
            }
        }
    ],
    // Re-export the component on the plugin object so it is easily accessible in patches
    PronounComponent
});
