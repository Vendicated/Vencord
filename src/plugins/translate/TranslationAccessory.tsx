/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Parser, useEffect, useState } from "@webpack/common";
import { Message } from "discord-types/general";

import { Languages } from "./languages";
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
            (translated from {Languages[translation.src] ?? translation.src} - <Dismiss onDismiss={() => setTranslation(undefined)} />)
        </span>
    );
}
