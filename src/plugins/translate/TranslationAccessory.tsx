/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Parser, useEffect, useState } from "@webpack/common";
import { Message } from "discord-types/general";

import { TranslateIcon } from "./TranslateIcon";
import { cl, TranslationValue } from "./utils";

const TranslationSetters = new Map<string, (v: TranslationValue) => void>();

export function handleTranslate(messageId: string, data: TranslationValue) {
    TranslationSetters.get(messageId)!(data);
}

function Dismiss({ onDismiss }: { onDismiss: () => void; }) {
    return (
        <button
            onClick={onDismiss}
            className={cl("dismiss")}
        >
            Dismiss
        </button>
    );
}

export function TranslationAccessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<TranslationValue>();

    useEffect(() => {
        // Ignore MessageLinkEmbeds messages
        if ((message as any).vencordEmbeddedBy) return;

        TranslationSetters.set(message.id, setTranslation);

        return () => void TranslationSetters.delete(message.id);
    }, []);

    if (!translation) return null;

    return (
        <span className={cl("accessory")}>
            <TranslateIcon width={16} height={16} />
            {Parser.parse(translation.text)}
            {" "}
            (translated from {translation.sourceLanguage} - <Dismiss onDismiss={() => setTranslation(undefined)} />)
        </span>
    );
}
