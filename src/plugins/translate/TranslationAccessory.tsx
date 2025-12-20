/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

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
            <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />
            {Parser.parse(translation.text)}
            <br />
            (translated from {translation.sourceLanguage} - <Dismiss onDismiss={() => setTranslation(undefined)} />)
        </span>
    );
}
