import definePlugin from "../utils/types";
import { ApplicationCommandInputType, OptionalMessageOption, sendBotMessage, findOption, RequiredMessageOption } from "../api/Commands";
import { Devs } from "../utils/constants";

export default definePlugin({
    name: "moarKaomojis",
    description: "Sometimes you want to express yourself with moar kaomojis",
    authors: [
        Devs.Arjix,
        Devs.echo,
        {
            name: "Jacob.Tm",
            id: 302872992097107991n
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "dissatisfaction",
            description: "＞﹏＜",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ＞﹏＜"
            }),
        },
        {
            name: "happy",
            description: "ヽ(´▽`)/",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ヽ(´▽`)/"
            }),
        },
        {
            name: "crying",
            description: "ಥ_ಥ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ಥ_ಥ"
            }),
        },
        {
            name: "anger",
            description: "ヽ(ｏ`皿′ｏ)ﾉ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ヽ(ｏ`皿′ｏ)ﾉ"

            }),
        },
        {
            name: "joy",
            description: "<(￣︶￣)>",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " <(￣︶￣)>"
            }),
        },
        {
            name: "???",
            description: "easter egg",
            execute() {
                const audio = new Audio("https://github.com/Jacob1Tm/Vencord-plugins-files/blob/main/secret-2.mp3?raw=true");
                audio.play();
                return {
                    content: "Just got rickrolled"
                }
            }
        }
    ]
});
