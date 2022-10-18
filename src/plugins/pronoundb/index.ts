import definePlugin, { OptionType } from "../../utils/types";
import PronounsAboutComponent from "./components/PronounsAboutComponent";
import PronounsComponent from "./components/PronounsComponent";

export enum PronounsFormat {
    Lowercase = "LOWERCASE",
    Capitalized = "CAPITALIZED"
}

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
                replace: "[$1, Vencord.Plugins.plugins.PronounDB.PronounsComponent(e)]"
            }
        }
    ],
    options: {
        pronounsFormat: {
            type: OptionType.SELECT,
            description: "The format for pronouns to appear in chat",
            options: [
                {
                    label: "Lowercase",
                    value: PronounsFormat.Lowercase,
                    default: true
                },
                {
                    label: "Capitalized",
                    value: PronounsFormat.Capitalized
                }
            ]
        },
        showSelf: {
            type: OptionType.BOOLEAN,
            description: "Enable or disable showing pronouns for the current user",
            default: true
        }
    },
    settingsAboutComponent: PronounsAboutComponent,
    // Re-export the component on the plugin object so it is easily accessible in patches
    PronounsComponent
});
