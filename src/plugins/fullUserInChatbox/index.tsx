import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
const normalMessageComponent = findByCodeLazy(".USER_MENTION)");
export default definePlugin({
    name: "FullUserInChatbox",
    description: "",
    authors: [Devs.sadan],

    patches: [
        {
            find: "UNKNOWN_ROLE_PLACEHOLDER]",
            replacement: {
                match: /(hidePersonalInformation.*?)return/,
                replace: "$1return $self.patchChatboxMention(arguments[0]);"
            }
        }
    ],

    patchChatboxMention(props) {
        return normalMessageComponent({
            className: "mention",
            userId: props.id,
            channelId: props.channelId,
            inlinePreview: undefined
        })
    },
})

