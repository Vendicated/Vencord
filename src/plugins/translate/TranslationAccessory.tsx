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

import { Message } from "@vencord/discord-types";
import { MessageFlags } from "@vencord/discord-types/enums";
import { ChannelStore, ComponentDispatch, FluxDispatcher, MessageTypeSets, Parser, showToast, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { TranslateIcon } from "./TranslateIcon";
import { cl, findTargetLanguage, TranslationValue } from "./utils";

interface TranslationSetter {
    messageId: string;
    handleTranslation(v: TranslationValue): void;
}

const TranslationSetters = new Set<TranslationSetter>();

// replied message id -> language the reply to it gets translated to
export const ReplyLanguages = new Map<string, string>();

export function handleTranslate(messageId: string, data: TranslationValue) {
    for (const setter of TranslationSetters) {
        if (setter.messageId === messageId) {
            setter.handleTranslation(data);
        }
    }
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

function ReplyInLanguage({ message, languageCode }: { message: Message; languageCode: string; }) {
    // service is subscribed so the link re-maps when the language list changes
    settings.use(["service"]);

    const target = findTargetLanguage(languageCode);
    if (!target || !MessageTypeSets.REPLYABLE.has(message.type) || message.hasFlag(MessageFlags.EPHEMERAL)) return null;

    const [value, label] = target;

    return (
        <>
            {" - "}
            <button
                onClick={() => {
                    const channel = ChannelStore.getChannel(message.channel_id);
                    FluxDispatcher.dispatch({
                        type: "CREATE_PENDING_REPLY",
                        channel,
                        message,
                        shouldMention: true,
                        showMentionToggle: channel.guild_id !== null,
                        _vcTranslateTo: value
                    });
                    ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
                    showToast({ text: `Your reply will be translated to ${label}`, variant: "success" });
                }}
                className={cl("reply-in-language")}
            >
                Reply in {label}
            </button>
        </>
    );
}

export function TranslationAccessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<TranslationValue>();

    useEffect(() => {
        // Ignore MessageLinkEmbeds messages
        if ((message as any).vencordEmbeddedBy) return;

        const setter: TranslationSetter = {
            messageId: message.id,
            handleTranslation: setTranslation
        };

        TranslationSetters.add(setter);
        return () => void TranslationSetters.delete(setter);
    }, []);

    if (!translation) return null;

    return (
        <span className={cl("accessory")}>
            <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />
            {Parser.parse(translation.text)}
            <br />
            (translated from {translation.sourceLanguage}
            <ReplyInLanguage message={message} languageCode={translation.sourceLanguageCode} />
            {" - "}
            <Dismiss onDismiss={() => setTranslation(undefined)} />)
        </span>
    );
}
