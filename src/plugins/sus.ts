// Based of fart.ts

import { ApplicationCommandOptionType } from "../api/Commands";
import definePlugin from "../utils/types";

const sound = { sus: new Audio("https://www.myinstants.com/media/sounds/untitled_hG6mBU5.mp3") };

export default definePlugin({
    name: "SUS",
    authors: [
    {
      id:"382960284135849984",
      name:"EMPTY"
    }
  ],
    description: "Provides a simple way to tell everyone that someone is SUS",
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "sus",
        description: "Makes the 'imposter' look sus",
        options: [
            {
                type: ApplicationCommandOptionType.USER,
                name: "imposter",
                description: "A Discord™ user that may or may not be an imposter. SUS",
                required: true
            }
        ],

        execute(args) {
            sound.sus.volume = 0.3;
            sound.sus.play();
            return {
                content: `When <@${args[0].value}> is SUS`
            };
        },
    }]
});
