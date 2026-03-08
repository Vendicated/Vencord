import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { MessageActions } from "@webpack/common";

export default definePlugin({
    name: "MessageModifier",
    description: "Modifies outgoing messages with custom suffixes.",
    authors: [Devs.ikito],
    settings: {
        suffix: {
            type: OptionType.STRING,
            default: " (sent via Vencord)",
            description: "The text to append to your messages",
        }
    },
    patches: [
        {
            find: "sendMessage:function",
            replacement: {
                match: /sendMessage:function\(\w+,(\w+)\)\{/,
                replace: "sendMessage:function(e,$1){$1.content+=this.settings.suffix.get()||' (sent via Vencord)';",
            }
        }
    ]
});
