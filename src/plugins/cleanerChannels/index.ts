import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Remove Channel Icons",
    description: "Removes the # symbol next to text channels, the blowhorn icon next to announcement channels, and the rules icon.",
    authors: [Devs.jsh4d],
    patches: [
        {
            find: /iconHash:\{[^}]*icon:/,
            replacement: () => "",
            match: /iconHash:\{[^}]*icon:"#"/,
            replace: "iconHash:{}",
        },
        {
            find: /iconBlowhorn:\{[^}]*icon:/,
            replacement: () => "",
            match: /iconBlowhorn:\{[^}]*icon:"blowhorn"/,
            replace: "iconBlowhorn:{}",
        },
        {
            find: /iconRules:\{[^}]*icon:/,
            replacement: () => "",
            match: /iconRules:\{[^}]*icon:"rules"/,
            replace: "iconRules:{}",
        },
    ],
    start() {
        console.log("cleanerChannels start");
    },
    stop() {
        console.log("cleanerChannels stop");
    },
});
