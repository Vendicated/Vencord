import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "MessageAccessoriesAPI",
    description: "API to add message accessories.",
    authors: [Devs.Cyn],
    patches: [
        {
            find: "_messageAttachmentToEmbedMedia",
            replacement: {
                match: /\(\)\.container\)},(.+?)\)};return/,
                replace: (_, accessories) =>
                    `().container)},Vencord.Api.MessageAccessories._modifyAccessories([${accessories}],this.props))};return`,
            },
        },
    ],
});
