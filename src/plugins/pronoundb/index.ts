import definePlugin, { OptionType } from "../../utils/types";
import PronounsAboutComponent from "./components/PronounsAboutComponent";
import PronounsChatComponent from "./components/PronounsChatComponent";
import PronounsProfileWrapper from "./components/PronounsProfileWrapper";

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
        // Patch the chat timestamp element
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(?<=return\s+\w{1,3}\.createElement\(.+!\w{1,3}&&)(\w{1,3}.createElement\(.+?\{.+?\}\))/,
                replace: "[$1, Vencord.Plugins.plugins.PronounDB.PronounsChatComponent(e)]"
            }
        },
        // Hijack the discord pronouns section (hidden without experiment) and add a wrapper around the text section
        {
            find: ".headerTagUsernameNoNickname",
            replacement: {
                match: /""!==(.{1,2})&&(r\.createElement\(r\.Fragment.+?\.Messages\.USER_POPOUT_PRONOUNS.+?pronounsText.+?\},\1\)\))/,
                replace: (_, __, fragment) => `Vencord.Plugins.plugins.PronounDB.PronounsProfileWrapper(e, ${fragment})`
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
    // Re-export the components on the plugin object so it is easily accessible in patches
    PronounsChatComponent,
    PronounsProfileWrapper
});
