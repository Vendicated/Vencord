import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Just google bro",
    authors: [
    {
      id:"382960284135849984",
      name:"EMPTY"
    }
  ],
    description: "Someone asking a stupid question ? Just forward them to google.",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "google",
        description: "Sends back a link to google with the selected query",
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: "Query",
                description: "Googler query",
                required: true
            }
        ],

        execute(args) {
            return {
                content: encodeURI("https://www.google.com/search?q=" + args[0].value)
            };
        },
    }]
});
