import { ApplicationCommandOptionType } from "../api/Commands";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

const sound = { fart: new Audio("https://raw.githubusercontent.com/ItzOnlyAnimal/AliuPlugins/main/fart.mp3") };

export default definePlugin({
    name: "Fart2",
    authors: [Devs.Animal],
    description: "Enable farting v2, a slash command that allows you to perform or request that someone perform a little toot.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "fart",
        description: "A simple command in which you may either request that a user do a little toot for you, or conduct one yourself.",
        options: [
            {
                type: ApplicationCommandOptionType.USER,
                name: "user",
                description: "A Discord™ user of which you would humbly request a toot from.",
                required: false
            }
        ],

        execute(args) {
            sound.fart.volume = 0.3;
            sound.fart.play();
            return {
                content: (args[0]) ? `<@${args[0].value}> fart` : "fart"
            };
        },
    }]
});
