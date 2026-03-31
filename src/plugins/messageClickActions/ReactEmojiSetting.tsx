/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Heading } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import type { IPluginOptionComponentProps } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { ChannelStore, IconUtils, Popout, SelectedChannelStore, TextInput, useRef, useState, useStateFromStores } from "@webpack/common";

import { settings } from ".";

export const MAX_ADDITIONAL_REACT_EMOJIS = 8;
const cl = classNameFactory("vc-message-click-actions-");

type EmojiSelectPayload = {
    id?: string | null;
    name?: string | null;
    optionallyDiverseSequence?: string;
    animated?: boolean;
};

type ReactionEmojiPickerProps = {
    channel?: Channel | null;
    closePopout(): void;
    onSelectEmoji(selection: {
        emoji: EmojiSelectPayload | null;
        willClose: boolean;
    }): void;
};

const ReactionEmojiPicker = findComponentByCodeLazy<ReactionEmojiPickerProps>(
    "showAddEmojiButton:",
    "pickerIntention:",
    "messageId:"
);

function parseCustomEmoji(value: string) {
    return value.match(/^(?:<(?:(a):)?|:)?([\w-]+?)(?:~\d+)?:([0-9]+)>?$/);
}

function getEmojiValue(emoji: EmojiSelectPayload | null | undefined) {
    if (!emoji) return "";
    if (emoji.id && emoji.name) return `${emoji.name}:${emoji.id}`;
    if (emoji.optionallyDiverseSequence?.trim()) return emoji.optionallyDiverseSequence;
    return emoji.name?.trim() ?? "";
}

function toRenderedEmoji(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const customEmoji = parseCustomEmoji(trimmed);
    if (customEmoji) {
        return {
            kind: "custom" as const,
            id: customEmoji[3],
            name: customEmoji[2],
            animated: customEmoji[1] === "a"
        };
    }

    return {
        kind: "unicode" as const,
        name: trimmed,
        animated: false
    };
}

function getCustomEmojiSources(id: string, animated: boolean) {
    const staticUrl = IconUtils.getEmojiURL({ id, animated: false, size: 48 });
    if (!animated) return [staticUrl];

    const animatedUrl = IconUtils.getEmojiURL({ id, animated: true, size: 48 });
    return animatedUrl === staticUrl ? [staticUrl] : [animatedUrl, staticUrl];
}

function CustomEmojiPreview({
    id,
    name,
    animated
}: {
    id: string;
    name: string;
    animated: boolean;
}) {
    const sources = getCustomEmojiSources(id, animated);
    const [srcIndex, setSrcIndex] = useState(0);

    return (
        <img
            src={sources[srcIndex]}
            alt={name}
            width={34}
            height={34}
            className={cl("emoji-preview")}
            onError={() => setSrcIndex(current => current < sources.length - 1 ? current + 1 : current)}
        />
    );
}

function EmojiPickerButton({
    onSelect,
    children
}: {
    onSelect(value: string): void;
    children?: React.ReactNode;
}) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const channel = useStateFromStores([SelectedChannelStore, ChannelStore], () => {
        const channelId = SelectedChannelStore.getChannelId();
        return channelId ? ChannelStore.getChannel(channelId) : null;
    });

    return (
        <Popout
            position="bottom"
            align="left"
            targetElementRef={triggerRef}
            renderPopout={({ closePopout }) => (
                <ReactionEmojiPicker
                    channel={channel}
                    closePopout={closePopout}
                    onSelectEmoji={({ emoji, willClose }) => {
                        const nextValue = getEmojiValue(emoji);
                        if (nextValue) onSelect(nextValue);
                        if (willClose) closePopout();
                    }}
                />
            )}
        >
            {popoutProps => (
                <div
                    {...popoutProps}
                    ref={triggerRef}
                    className={cl("emoji-trigger")}
                >
                    {children ?? "Pick Emoji"}
                </div>
            )}
        </Popout>
    );
}

function parseEmojiList(value: string) {
    return Array.from(new Set(
        value
            .split(/[\n,]/g)
            .map(entry => entry.trim())
            .filter(Boolean)
    )).slice(0, MAX_ADDITIONAL_REACT_EMOJIS);
}

function addEmojiToList(list: string, emoji: string) {
    const parsedList = parseEmojiList(list);
    if (parsedList.includes(emoji)) return parsedList.join(", ");

    return [...parsedList, emoji]
        .slice(0, MAX_ADDITIONAL_REACT_EMOJIS)
        .join(", ");
}

function EmojiPreview({ value }: { value: string; }) {
    const renderedEmoji = toRenderedEmoji(value);
    if (!renderedEmoji) return <>Pick Emoji</>;

    if (renderedEmoji.kind === "custom") {
        return (
            <CustomEmojiPreview
                id={renderedEmoji.id}
                name={renderedEmoji.name}
                animated={renderedEmoji.animated}
            />
        );
    }

    return <span className={cl("unicode-preview")}>{renderedEmoji.name}</span>;
}

export function ReactEmojiSetting({ setValue }: IPluginOptionComponentProps) {
    const [emoji, setEmoji] = useState(settings.store.reactEmoji ?? "💀");

    return (
        <div>
            <Heading>Select Emoji For Reactions</Heading>
            <div className={cl("primary-emoji-picker")}>
                <EmojiPickerButton
                    onSelect={newValue => {
                        setEmoji(newValue);
                        setValue(newValue);
                    }}
                >
                    <EmojiPreview value={emoji} />
                </EmojiPickerButton>
            </div>
        </div>
    );
}

export function AdditionalReactEmojisSetting({ setValue }: IPluginOptionComponentProps) {
    const { addAdditionalReacts } = settings.use(["addAdditionalReacts"]);
    const [emojiList, setEmojiList] = useState(settings.store.additionalReactEmojis ?? "");

    if (!addAdditionalReacts) return null;

    return (
        <div>
            <Heading>Select Additional Emojis</Heading>
            <div
                style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    maxWidth: 420
                }}
            >
                <TextInput
                    value={emojiList}
                    placeholder={`comma/newline separated, max ${MAX_ADDITIONAL_REACT_EMOJIS}`}
                    onChange={newValue => {
                        setEmojiList(newValue);
                        setValue(newValue);
                    }}
                    onClick={event => event.stopPropagation()}
                    onMouseDown={event => event.stopPropagation()}
                    style={{
                        flex: 1
                    }}
                />
                <EmojiPickerButton
                    onSelect={newValue => {
                        const nextValue = addEmojiToList(emojiList, newValue);
                        setEmojiList(nextValue);
                        setValue(nextValue);
                    }}
                />
            </div>
        </div>
    );
}
