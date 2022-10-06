import definePlugin from "../utils/types";
import { findOption, RequiredMessageOption } from "../api/Commands";
const endings = [
    "owo",
    "UwU",
    ">w<",
    "^w^",
    "●w●",
    "☆w☆",
    "𝗨𝘄𝗨",
    "(´꒳`)",
    "♥(。U ω U。)",
    "(˘ε˘)",
    "*screams*",
    "*twerks*",
    "*sweats*",
];
function uwuify(message: string): string {
    return message
        .split(" ")
        .map((element) => {
            if (element.length < 2) {
                return element;
            }
            let isowo = false;
            if (!element.toLowerCase().includes("owo")) {
                element = element.replace("o", "OwO");
                isowo = true;
            }
            if (!element.toLowerCase().includes("uwu") && !isowo) {
                element = element.replace("u", "UwU");
                isowo = true;
            }
            if (!element.toLowerCase().endsWith("n")) {
                element = element.replace("n", "ny");
            }
            if (Math.floor(Math.random() * 2) == 1) {
                element.replace("s", "sh");
            }
            if (Math.floor(Math.random() * 5) == 3) {
                element =
                    element +
                    " " +
                    endings[Math.floor(Math.random() * endings.length)];
            }
            element = element.replace("r", "w").replace("l", "w");
            return element;
        })
        .join(" ");
}

export default definePlugin({
    name: "UwUifier",
    description: "Simply uwuify commands",
    authors: [{ name: "ECHO", id: 712639419785412668n }],
    dependencies: ["CommandsAPI"],

    commands: [
        {
            name: "uwuify",
            description: "uwuifies your messages",
            options: [RequiredMessageOption],

            execute: (opts) => ({
                content: uwuify(findOption(opts, "message", "")),
            }),
        },
    ],
});
