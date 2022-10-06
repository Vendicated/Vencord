import definePlugin from "../utils/types";
import { ApplicationCommandOptionType, registerCommand, unregisterCommand } from "../api/Commands";
import {
    ApplicationCommandInputType,
    ApplicationCommandType,
} from "../api/Commands";

export default definePlugin({
    name: "UwUifier",
    description: "Simply uwuify commands",
    authors: [ {name: "ECHO",
        id: 712639419785412668n }],
    start() {
        registerCommand({
            name: "uwuify",
            description: "uwuifies your messages",
            type: ApplicationCommandType.CHAT_INPUT,
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            execute (args, ctx) {
                let uwuifying = args[0].value.split(" ");
                let final = "";
                let isowo = false;
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
                    "(*ฅ́˘ฅ̀*)",
                    "*screams*",
                    "*twerks*",
                    "*sweats*",
                  ];
                uwuifying.forEach(element => {
                    if (!element.toLowerCase().includes("owo")){
                        element = element.replace("o", "OwO")
                        isowo = true;
                    }
                    if (!element.toLowerCase().includes("uwu") && !isowo){
                        element = element.replace("u", "UwU");
                        isowo = true;
                    }
                    if (!element.toLowerCase().endsWith("n")){
                        element = element.replace("n", "ny");
                    }
                    if (Math.floor(Math.random() * 2) == 1){
                        element.replace("s", "sh");
                    }
                    if (Math.floor(Math.random() * 5) == 3){
                        element = element + " " + endings[Math.floor(Math.random()*endings.length)];
                    }
                    element = element.replace("r", "w").replace("l", "w");
                    final += element + " ";
                });
                return{
                    content: final
                };
            },
            options:[
                {
                    name: "message",
                    description: "option",
                    type: ApplicationCommandOptionType.STRING
                }
            ],
        }, "bleh");
    },

    stop() {
        unregisterCommand(this.helloWorld);
    },
});
