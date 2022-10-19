import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchReddit(sub: string) {
    const r = rand(1, 100);
    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=${r}&t=all`);
    const resp = await res.json();
    try {
        return resp.data.children[r-1].data.url;
    } catch (err) {
        console.error(resp);
        console.error(r);
        console.error(err);
    }
    return "";
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
        options: [
            {
                name: "cat",
                description: "If set, this will send exclusively cute anime cat boys",
                type: ApplicationCommandOptionType.BOOLEAN,
                required: false,
            },
        ],

        async execute(args) {
            let sub = "cuteanimeboys";

            if (args.length > 0) {
                const v = args[0].value as any as boolean;
                if (v) {
                    sub = "animecatboys";
                }
            }

            return {
                content: await fetchReddit(sub),
            };
        },
    }]
});
