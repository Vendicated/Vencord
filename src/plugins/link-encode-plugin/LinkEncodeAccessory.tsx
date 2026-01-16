/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

import { LinkEncodeIcon } from "./LinkEncodeIcon";
import { cl, DecryptedValue } from "./utils";

// Use WeakMap for automatic cleanup when messages are garbage collected
// This prevents memory leaks from messages that are no longer in view
const DecryptedSetters = new Map<string, (v: DecryptedValue) => void>();

export function handleDecrypt(messageId: string, data: DecryptedValue): void {
    DecryptedSetters.get(messageId)?.(data);
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

export function LinkEncodeAccessory({ message }: { message: Message; }) {
    const [decrypted, setDecrypted] = useState<DecryptedValue>();

    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        DecryptedSetters.set(message.id, setDecrypted);

        return () => {
            DecryptedSetters.delete(message.id);
        };
    }, [message.id]);

    if (!decrypted) return null;

    return (
        <span className={cl("accessory")}>
            <LinkEncodeIcon width={16} height={16} className={cl("accessory-icon")} />
            {Parser.parse(decrypted.text)}
            <br />
            <span className={cl("accessory-label")}>
                (Decrypted message — <Dismiss onDismiss={() => setDecrypted(undefined)} />)
            </span>
        </span>
    );
}
