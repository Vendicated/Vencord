import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";
import { Devs } from "@utils/constants";

async function shortenUrl(url) {
    try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
        if (res.ok) {
            const shortenedUrl = await res.text();
            return shortenedUrl;
        } else {
            throw new Error("Failed to shorten the URL");
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default definePlugin({
    name: "UrlShortener",
    authors: [Devs.trappist],
    description: "Add a command to shorten URLs and send them in the chat",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "shorten",
        description: "Create shorter URLs",
        options: [
            {
                name: "url",
                description: "Paste the link you wish to shorten here (If you type anything other than a link, it will send as a normal message)",
                type: ApplicationCommandOptionType.STRING,
                required: true,
            },
        ],

        async execute(args) {
            const inputText = args[0].value as string;
            const shortenedUrl = await shortenUrl(inputText);

            return {
                content: shortenedUrl || inputText,
            };
        },
    }],
});
