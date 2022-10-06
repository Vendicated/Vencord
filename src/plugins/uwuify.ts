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
    "(ᗒᗨᗕ)",
    "(▰˘v˘▰)",
    "( ´ ▽ ` ).｡ｏ♡",
    "*unbuttons shirt*",
    ">3<",
    ">:3",
    ":3",
    "murr~",
    "♥(。U ω U。)",
    "(˘ε˘)",
    "*screams*",
    "*twerks*",
    "*sweats*",
];
const words = [
    ["love", "wuv"],
    ["mr", "mistuh"],
    ["dog", "doggo"],
    ["cat", "kitteh"],
    ["hello", "henwo"],
    ["hell", "heck"],
    ["fuck", "fwick"],
    ["fuk", "fwick"],
    ["shit", "shoot"],
    ["friend", "fwend"],
    ["stop", "stawp"],
    ["god", "gosh"],
    ["dick", "peepee"],
    ["penis", "bulge"],
    ["damn", "darn"],
];
function uwuify(message: string): string {
    let isowo = false;
    return message
        .split(" ")
        .map((element) => {
            isowo = false;
            if (element.length < 4) {
                return element;
            }
            for (let [find, replace] of words) {
                if (element.includes(find)) {
                    element = element.replace(find, replace);
                    isowo = true;
                }
            }
            if (
                !element.toLowerCase().includes("owo") &&
                Math.floor(Math.random() * 2) == 1
            ) {
                element = element.replace("o", "OwO");
                isowo = true;
            }
            if (
                !element.toLowerCase().includes("uwu") &&
                !isowo &&
                Math.floor(Math.random() * 2) == 1
            ) {
                element = element.replace("u", "UwU");
                isowo = true;
            }
            if (!element.toLowerCase().endsWith("n") && !isowo) {
                element = element.replace("n", "ny");
            }
            if (Math.floor(Math.random() * 2) == 1 && !isowo) {
                element.replace("s", "sh");
            }
            if (Math.floor(Math.random() * 9) == 3) {
                element =
                    element +
                    " " +
                    endings[Math.floor(Math.random() * endings.length)];
            }
            if (element.toLowerCase().endsWith("y") && element.length < 7) {
                element = element + " " + "w" + element.slice(1);
            }
            if (Math.floor(Math.random() * 5) == 3 && !isowo) {
                element = element[0] + "-" + element[0] + "-" + element;
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
