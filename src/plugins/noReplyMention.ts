import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [{
        name: "DustyAngel47",
        id: 714583473804935238n
    }],
    patches: [
        {
            find: "CREATE_PENDING_REPLY:function",
            replacement: {
                match: /CREATE_PENDING_REPLY:function\((.{1,2})\){/,
                replace: "CREATE_PENDING_REPLY:function($1){$1.shouldMention=false;"
            }
        }
    ]
})
