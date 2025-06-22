/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { EmojiStore, RestAPI } from "@webpack/common";
import { settings } from "./settings";

function addReaction(messageId: string, emojiId: string, channelId: string) {
    try {
        const emoji = EmojiStore.getCustomEmojiById(emojiId);
        if (!emoji) {
            console.error(`[AutoReact] Эмодзи с ID ${emojiId} не найдено.`);
            return;
        }

        // Формат для кастомных эмодзи: name:id
        const emojiApiFormat = `${emoji.name}:${emoji.id}`;

        console.log(`[AutoReact] Пытаемся добавить реакцию:`, { messageId, emojiId, channelId, emojiApiFormat });

        RestAPI.put({
            url: `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emojiApiFormat)}/@me`,
        }).then(() => {
            console.log("[AutoReact] Реакция успешно добавлена!");
        }).catch(error => {
            console.error("[AutoReact] Ошибка при добавлении реакции:", error);
        });
    } catch (error) {
        console.error("[AutoReact] Ошибка при добавлении реакции:", error);
    }
}

export default definePlugin({
    name: "AutoReact",
    description: "Автоматически ставит реакцию на сообщения с определенными словами в конкретном канале",
    authors: [Devs.Ven],
    settings,

    start() {
        console.log("[AutoReact] Плагин запущен!");
        console.log("[AutoReact] Настройки:", {
            serverId: settings.store.serverId,
            channelId: settings.store.channelId,
            reactionEmojiId: settings.store.reactionEmojiId,
            triggerWords: settings.store.triggerWords
        });
    },

    flux: {
        MESSAGE_CREATE(event: any) {
            const message = event.message;
            if (!message) return;

            // Получаем настройки
            const targetServerId = settings.store.serverId;
            const targetChannelId = settings.store.channelId;
            const reactionEmojiId = settings.store.reactionEmojiId;
            const triggerWords = settings.store.triggerWords.split(",").map(word => word.trim().toLowerCase());

            // Проверяем, что сообщение из нужного сервера и канала
            const guildId = message.guild_id;
            const channelId = message.channel_id;

            console.log("[AutoReact] Новое сообщение:", {
                guildId,
                channelId,
                targetServerId,
                targetChannelId,
                content: message.content?.substring(0, 50) + "..."
            });

            if (guildId !== targetServerId || channelId !== targetChannelId) {
                console.log("[AutoReact] Сообщение не из целевого сервера/канала");
                return;
            }

            // Проверяем содержимое сообщения на наличие триггерных слов
            const content = message.content?.toLowerCase() || "";
            const hasTriggerWord = triggerWords.some(word => content.includes(word));

            console.log("[AutoReact] Проверка триггерных слов:", {
                content: content.substring(0, 50) + "...",
                triggerWords,
                hasTriggerWord
            });

            if (hasTriggerWord) {
                console.log("[AutoReact] Найдено триггерное слово! Добавляем реакцию...");
                // Ставим реакцию
                addReaction(message.id, reactionEmojiId, targetChannelId);
            }
        }
    }
}); 