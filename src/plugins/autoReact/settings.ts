import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    serverId: {
        type: OptionType.STRING,
        description: "ID сервера, где будет работать плагин",
        default: "1129361333129838603"
    },
    channelId: {
        type: OptionType.STRING,
        description: "ID канала, где будет работать плагин",
        default: "1327494826039705650"
    },
    reactionEmojiId: {
        type: OptionType.STRING,
        description: "ID эмодзи для реакции",
        default: "1129371180319645767"
    },
    triggerWords: {
        type: OptionType.STRING,
        description: "Слова для поиска (через запятую)",
        default: "мудрый,мудро"
    }
}); 