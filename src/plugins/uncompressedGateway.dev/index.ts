import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Uncompressed Gateway",
    description: "Allows you to easily read Discord's gateway responses.",
    tags: ["Console", "Developers", "Utility"],
    authors: [Devs.Cootshk],
    patches: [
        // {
        //     find: / /,
        //     replacement: {
        //         match: / /,
        //         replace: " "
        //     }
        // }
    ]

});