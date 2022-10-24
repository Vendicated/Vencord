import definePlugin from "../utils/types";
import { ApplicationCommandInputType, OptionalMessageOption, sendBotMessage, findOption, RequiredMessageOption } from "../api/Commands";

export default definePlugin({
    name: "moarKaomojis",
    description: "Adds more Kaomojis to discord. ヽ(´▽`)/",
    authors: [
        {
            name: "Jacob.Tm",
            id: 302872992097107991n
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        { name: "dissatisfaction", description: " ＞﹏＜" },
        { name: "smug", description: " ಠ_ಠ" },
        { name: "happy", description: " ヽ(´▽`)/" },
        { name: "crying", description: " ಥ_ಥ" },
        { name: "angry", description: " ヽ(｀Д´)ﾉ" },
        { name: "anger", description: " ヽ(ｏ`皿′ｏ)ﾉ" },
        { name: "joy", description: " <(￣︶￣)>" },
    ].map(data => ({
        ...data,
        options: [OptionalMessageOption],
        execute: opts => ({
            content: findOption(opts, "message", "") + data.description
        })
    }))
});
