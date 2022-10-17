import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchReddit() {
    const r = rand(1, 100);
    const res = await fetch(`https://www.reddit.com/r/cuteanimeboys/top.json?limit=${r}&t=all`);
    const resp = await res.json();
    let url = "";
    try {
        url = resp.data.children[r-1].data.url;
    } catch (err) {
        console.error(resp);
        console.error(r);
        console.error(err);
    }
    return url;
}

export default definePlugin({
    name: "Cute-Anime-Boys",
    authors: [{
        name: "Shady Goat",
        id: BigInt(376079696489742338),
    }],
    description: "Add a command to send cute anime boys in the chat",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "anime-boys",
        description: "Send cute anime boys",

        async execute() {
            return {
                content: await fetchReddit(),
            };
        },
    }]
});
