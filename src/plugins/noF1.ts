import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "No F1",
    description: "Disables F1 help bind.",
    authors: [Devs.Cyn],
    patches: [
        {
            find: ',"f1"],comboKeysBindGlobal:',
            replacement: {
                match: ',"f1"],comboKeysBindGlobal:',
                replace: "],comboKeysBindGlobal:",
            },
        },
    ],
});
