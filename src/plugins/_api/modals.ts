import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "ImageModalAPI",
    authors: [Devs.sadan],
    description: "Allows you to open Image Modals",
    patches: [
        {
            find: "SCALE_DOWN:",
            replacement: {
                match: /!\(null==(\i)\|\|0===\i\|\|null==(\i)\|\|0===\i\)/,
                replace: (_, width, height) => `!((null == ${width} || 0 === ${width}) && (null == ${height} || 0 === ${height}))`
            }
        }
    ]
});
