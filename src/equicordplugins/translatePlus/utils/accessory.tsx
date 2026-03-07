/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { languages } from "@equicordplugins/translatePlus/misc/languages";
import { cl, Translation } from "@equicordplugins/translatePlus/misc/types";
import { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

import { SmallIcon } from "./icon";
import { translate } from "./translator";

const setters = new Map();

export function Accessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<Translation | undefined>(undefined);

    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        setters.set(message.id, setTranslation);

        return () => void setters.delete(message.id);
    }, []);

    if (!translation) return null;

    return (
        <div className={cl("accessory")}>
            <SmallIcon />
            {Parser.parse(translation.text)}
            {" "}
            (translated from {languages[translation.src] ?? translation.src} - <button onClick={() => setTranslation(undefined)} className={cl("dismiss")}>Dismiss</button>)
        </div>
    );
}

export async function handleTranslate(message: Message) {
    setters.get(message.id)!(await translate(message.content));
}
