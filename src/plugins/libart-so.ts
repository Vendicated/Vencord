// Possibly libart.so issue but after sending, it may take a few sec to load.

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "libart.so",
    description: "Fetches art from libart.so.",
    authors: [Devs.MaiKokain],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "libart",
            description: "",
            async execute(args, ctx) {
                return ({ content: await call_libart() });
            },
        }
    ]
});

async function call_libart(): Promise<string> {
    // There might be a better RegEX but too dumb to write/test.

    let text = await fetch("https://libart.so").then(r => r.text());
    if (!/<a *?href=("?.*?src=")/g.test(text)) call_libart(); // Check if it's the correct response, becuz sometime it shows AliPay image :husk:
    text = text.replace(/<a *?href=("?.*?src=")/g, ""); // First Replace removing the top.
    text = text.replace(/ *?"(.*?a>)/g, ""); // Second Replace Removing the bottom

    return text;
}
