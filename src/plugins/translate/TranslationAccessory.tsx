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

import type { MessageRecord } from "@vencord/discord-types";
import { MarkupUtils, useEffect, useState } from "@webpack/common";

import { Languages } from "./languages";
import { TranslateIcon } from "./TranslateIcon";
import { cl, type TranslationValue } from "./utils";

const TranslationSetters = new Map<string, (v: TranslationValue) => void>();

export function handleTranslate(messageId: string, data: TranslationValue) {
    TranslationSetters.get(messageId)!(data);
}

const Dismiss = ({ onDismiss }: { onDismiss: () => void; }) => (
    <button
        onClick={onDismiss}
        className={cl("dismiss")}
    >
        Dismiss
    </button>
);

export function TranslationAccessory({ message }: { message: MessageRecord & { vencordEmbeddedBy?: string[] }; }) {
    const [translation, setTranslation] = useState<TranslationValue>();

    useEffect(() => {
        // Ignore MessageLinkEmbeds messages
        if (message.vencordEmbeddedBy) return;

        TranslationSetters.set(message.id, setTranslation);

        return () => { TranslationSetters.delete(message.id); };
    }, []);

    if (!translation) return null;

    return (
        <span className={cl("accessory")}>
            <TranslateIcon width={16} height={16} />
            {MarkupUtils.parse(translation.text)}
            {" "}
            {/* @ts-expect-error */}
            (translated from {Languages[translation.src] ?? translation.src} - <Dismiss onDismiss={() => { setTranslation(undefined); }} />)
        </span>
    );
}
