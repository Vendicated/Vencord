/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import "./styles.css";

import definePlugin from "@utils/types";

import { IaCorrectorChatBarButton, IaCorrectorIcon } from "./IaCorrectorIcon";
import { settings } from "./settings";
import { assertApiKey, callMistral, logger, showError, showSuccess } from "./utils";

export default definePlugin({
    name: "IaCorrector",
    description: "Correct your messages before sending using Mistral AI.",
    authors: [{ name: "HyperBeats", id: 768230588971745321n }],
    settings,

    chatBarButton: {
        icon: IaCorrectorIcon,
        render: IaCorrectorChatBarButton
    },

    async onBeforeMessageSend(_, message) {
        if (!(settings.store.autoCorrect ?? false)) return;

        const content = message.content?.trim();
        if (!content) return;

        const apiKey = (settings.store.apiKey ?? "").trim();
        if (!assertApiKey(apiKey)) return;

        try {
            const targetLanguage = settings.store.targetLanguage ?? "auto";

            logger.debug("Intercepting message before send", { length: content.length });
            const result = await callMistral(content, targetLanguage, apiKey);
            message.content = result.text;
            logger.debug("Replaced message content", { newLength: result.text.length });
            if (settings.store.showSuccessToast ?? true) showSuccess("Message corrected by IaCorrector.");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error("IaCorrector failed", err);
            showError(`Mistral error: ${errorMessage}`);
        }
    }
});
