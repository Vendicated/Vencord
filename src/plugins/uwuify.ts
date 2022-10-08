import definePlugin from "../utils/types";
import { findOption, RequiredMessageOption } from "../api/Commands";

//words have a chance of ending with these
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

//replacement words
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


//uwuify command
function uwuify(message: string): string {
    let isowo = false;
    return message
        .split(" ")
        .map(element => {
            isowo = false;
            let lowerCase = element.toLowerCase();
            //return if the word is too short - uwuifying short words makes them unreadable
            if (element.length < 4) {
                return element;
            }

            //replacing the words based on the array on line 29
            for (let [find, replace] of words) {
                if (element.includes(find)) {
                    element = element.replace(find, replace);
                    isowo = true;
                }
            }
            //these are the biggest word changes. if any of these are done we dont do the
            //ones after the isowo check. to keep the words somewhat readable
            if (lowerCase.includes("u") && !lowerCase.includes("uwu")) {
                element = element.replace("u", "UwU");
                isowo = true;
            }
            if (lowerCase.includes("o") && !lowerCase.includes("owo")) {
                element = element.replace("o", "OwO");
                isowo = true;
            }
            if (lowerCase.endsWith("y") && element.length < 7) {
                element = element + " " + "w" + element.slice(1);
                isowo = true;
            }

            //returning if word has been already uwuified - to prevent over-uwuifying
            if (isowo) {
                return element;
            }

            //more tiny changes - to keep the words that passed through the latter changes uwuified
            if (!lowerCase.endsWith("n")) {
                element = element.replace("n", "ny");
            }
            if (Math.floor(Math.random() * 2) == 1) {
                element.replace("s", "sh");
            }
            if (Math.floor(Math.random() * 5) == 3 && !isowo) {
                element = element[0] + "-" + element[0] + "-" + element;
            }
            if (Math.floor(Math.random() * 5) == 3) {
                element =
                    element +
                    " " +
                    endings[Math.floor(Math.random() * endings.length)];
            }
            element = element.replace("r", "w").replace("l", "w");
            return element;
        }).join(" ");
}



//actual command declaration
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

            execute: opts => ({
                content: uwuify(findOption(opts, "message", "")),
            }),
        },
    ],
});
