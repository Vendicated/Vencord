/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

import { cl, UrbanDefinition } from "./utils";

const UrbanSetters = new Map<string, (v: UrbanDefinition[] | undefined) => void>();

export function handleUrbanLookup(messageId: string, data: UrbanDefinition[]) {
    UrbanSetters.get(messageId)?.(data);
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

export function UrbanAccessory({ message, maxDefinitions }: { message: Message; maxDefinitions: number; }) {
    const [definitions, setDefinitions] = useState<UrbanDefinition[]>();

    useEffect(() => {
        UrbanSetters.set(message.id, setDefinitions);
        return () => void UrbanSetters.delete(message.id);
    }, [message.id]);

    if (!definitions || definitions.length === 0) return null;

    return (
        <div className={cl("accessory")}>
            <div className={cl("header")}>
                Urban Dictionary - <Dismiss onDismiss={() => setDefinitions(undefined)} />
            </div>
            {definitions.slice(0, maxDefinitions).map(def => (
                <div key={def.defid} className={cl("definition-container")}>
                    <div className={cl("word")}>{def.word}</div>
                    <div className={cl("definition")}>
                        {Parser.parse(def.definition.replace(/\[|\]/g, ""))}
                    </div>
                    {def.example && (
                        <div className={cl("example")}>
                            {Parser.parse(def.example.replace(/\[|\]/g, ""))}
                        </div>
                    )}
                    <div className={cl("footer")}>
                        by {def.author} | 👍 {def.thumbs_up} | 👎 {def.thumbs_down}
                    </div>
                </div>
            ))}
        </div>
    );
}
