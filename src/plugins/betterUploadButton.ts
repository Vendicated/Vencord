import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "BetterUploadButton",
    authors: [Devs.obscurity],
    description: "Upload with a single click, open menu with right click",
    patches: [
        {
            find: "Messages.CHAT_ATTACH_UPLOAD_OR_INVITE",
            replacement: {
                match: /CHAT_ATTACH_UPLOAD_OR_INVITE,onDoubleClick:([^,]+),onClick:([^,]+)}}/,
                replace:
                    "CHAT_ATTACH_UPLOAD_OR_INVITE,onClick:$1,onContextMenu:$2}}",
            },
        },
    ],
});
