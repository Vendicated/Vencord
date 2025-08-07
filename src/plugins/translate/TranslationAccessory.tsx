import { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { TranslateIcon } from "./TranslateIcon";
import { cl, TranslationValue, translate } from "./utils";

const TranslationSetters = new Map<string, (v: TranslationValue | undefined) => void>();

export function handleTranslate(messageId: string, data: TranslationValue) {
    const setter = TranslationSetters.get(messageId);
    if (setter) setter(data);
}

function Dismiss({ onDismiss }: { onDismiss: () => void }) {
    return (
        <button
            onClick={onDismiss}
            className={cl("dismiss")}
            style={{
                color: "#3B82F6", // blue color
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontWeight: "bold",
                marginLeft: "8px",
            }}
        >
            Dismiss
        </button>
    );
}

export function TranslationAccessory({ message }: { message: Message }) {
    const [translation, setTranslation] = useState<TranslationValue | undefined>();
    const autoChannelId = settings.store.autoTranslateChannelId;
    const isAutoChannel = message.channel_id === autoChannelId;

    // Register the setter for manual translate button
    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        TranslationSetters.set(message.id, setTranslation);
        return () => void TranslationSetters.delete(message.id);
    }, [message.id]);

    // Auto-translate for configured channel
    useEffect(() => {
        if (!message.content || !autoChannelId) return;
        if (!isAutoChannel || translation) return;

        translate("received", message.content)
            .then(res => setTranslation(res))
            .catch(console.error);
    }, [message.content, isAutoChannel, translation]);

    if (!translation) return null;

    return (
        <span
            className={cl("accessory")}
            style={{
                color: "#999999",
                fontStyle: "italic",
                marginTop: "4px",
                display: "inline-flex",
                alignItems: "center"
            }}
        >
            <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />
            <span style={{ marginLeft: "4px" }}>{Parser.parse(translation.text)}</span>
            <span style={{ marginLeft: "6px", whiteSpace: "nowrap" }}>
                (translated from {translation.sourceLanguage}
                {!isAutoChannel && (
                    <Dismiss onDismiss={() => setTranslation(undefined)} />
                )}
                )
            </span>
        </span>
    );
}
