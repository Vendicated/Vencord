/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, RichInputSubmitState, RichInputType, SlateNode } from "@vencord/discord-types";
import { DraftType } from "@vencord/discord-types/enums";
import { findByProps, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { RichInput, useCallback, useMemo, useRef, useState } from "@webpack/common";
import { ComponentProps, ComponentType, FocusEvent } from "react";

import ErrorBoundary from "./ErrorBoundary";

// Empty channel object used as a placeholder for inputs where the channel is irrelevant
const dummyChannel = proxyLazyWebpack(() => {
    const DmChannel: Channel & { new (base?: Partial<Channel>): Channel } = findByProps("fromServer", "sortRecipients");

    return Object.freeze(new DmChannel({ id: "0", type: 1 }));
});

function textToSlateNode(str: string = ""): SlateNode[] {
    return str.split("\n").map(text => ({ type: "line", children: [{ text }] }));
}

type RichInputProps = ComponentProps<typeof RichInput>;
type AfterSubmit = { shouldClear?: boolean; shouldRefocus?: boolean } | void;

export interface RichEditorProps extends Partial<
    Omit<RichInputProps, "onSubmit" | "onChange" | "textValue" | "richValue">
> {
    /**
     * Used for controlled input. Must be accompanied by {@link onChange}
     */
    value?: string;
    /**
     * Used for uncontrolled input.
     */
    defaultValue?: string;
    autoFocus?: boolean;
    onSubmit?: (state: RichInputSubmitState) => AfterSubmit | Promise<AfterSubmit>;
    onChange?: (textValue: string, richValue: SlateNode[]) => void;
}

/**
 * Wrapper for Discord's Slate input component with sane defaults and somewhat more predictable behavior
 */
export const RichEditor = ErrorBoundary.wrap(function RichEditor({
    value,
    defaultValue = "",
    type,
    channel = dummyChannel,
    onSubmit,
    onFocus,
    onBlur,
    onChange,
    focused,
    autoFocus = false,
    ...props
}: RichEditorProps) {
    const isControlled = value !== undefined;

    // Controlled input is required for the autocomplete popup to work correctly.
    const [textValue, setTextValue] = useState(isControlled ? value : defaultValue);

    // Rich value can just be an array of unformated lines on the first render, discord automatically
    // converts the content based on user settings (e.g. the legacy chat option in accessibility settings)
    const [richValue, setRichValue] = useState(() => textToSlateNode(textValue));

    const current = isControlled ? value : textValue;

    // Immediately re-render if the component is controlled and the external value changed.
    // This technically breaks the rules of react, but as long as you dont switch between
    // controlled and uncontrolled props (which you shouldn't!) it wont cause any issues.
    if (textValue !== current) {
        setTextValue(current);
        setRichValue(textToSlateNode(current));
    }

    // The autocomplete popup can't be displayed without an explicit focused prop
    const focusedRef = useRef(autoFocus);

    const handleFocus = useCallback(
        (ev: FocusEvent<HTMLDivElement>) => {
            focusedRef.current = true;
            onFocus?.(ev);
        },
        [onFocus]
    );
    const handleBlur = useCallback(
        (ev: FocusEvent<HTMLDivElement>) => {
            focusedRef.current = false;
            onBlur?.(ev);
        },
        [onBlur]
    );

    // Permission and draft options have some required properties
    const fullType: Partial<RichInputType> = useMemo(
        () => ({
            ...type,
            permissions: { requireCreateTherads: false, requireSendMessages: false, ...type?.permissions },
            drafts: { type: DraftType.ChannelMessage, ...type?.drafts },
            disableAutoFocus: !autoFocus
        }),
        [type, autoFocus]
    );

    // The onSubmit callback must specifically return a Promise (or a thenable object)
    // which returns an object with shouldClear and shouldRefocus keys. Make all of this optional by using await
    // and adding the missing properties manually.
    const handleSubmit = useMemo(() => {
        if (!onSubmit) return undefined;

        return async (state: RichInputSubmitState) => {
            const submit = await onSubmit(state);
            return { shouldClear: false, shouldRefocus: false, ...submit };
        };
    }, [onSubmit]);

    const handleChange = useCallback(
        // The first argument is always set to null for some reason, ignore it
        (_: unknown, text: string, rich: SlateNode[]) => {
            setTextValue(text);
            setRichValue(rich);
            onChange?.(text, rich);
        },
        [onChange]
    );

    return (
        <RichInput
            textValue={current}
            richValue={richValue}
            type={fullType}
            channel={channel}
            onSubmit={handleSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            focused={focused ?? focusedRef.current}
            {...props}
        />
    );
}) as ComponentType<RichEditorProps> & {
    /**
     * Default input types provided by discord.
     */
    PresetTypes: Record<
        | "NORMAL"
        | "OVERLAY"
        | "OVERLAY_INLINE_REPLY"
        | "SIDEBAR"
        | "EDIT"
        | "FORM"
        | "VOICE_CHANNEL_STATUS"
        | "THREAD_CREATION"
        | "USER_PROFILE"
        | "USER_PROFILE_REPLY"
        | "PROFILE_BIO_INPUT"
        | "CUSTOM_GIFT"
        | "RULES_INPUT"
        | "CREATE_FORUM_POST"
        | "CREATE_ANNOUNCEMENT_POST"
        | "CREATE_POLL"
        | "FORUM_CHANNEL_GUIDELINES"
        | "CHANNEL_TOPIC"
        | "ATOMIC_REACTOR_REPLY_INPUT"
        | "FORWARD_MESSAGE_INPUT"
        | "SHARE_CUSTOM_CLIENT_THEME_INPUT"
        | "HAVEN"
        | (string & {}),
        Readonly<Partial<RichInputType>>
    >;
    /**
     * Used for safely defining custom input types outside of a component.
     *
     * For example, this is how you can create a standard chat input with the gift button disabled:
     * ```js
     * const InputType = RichEditor.defineType(() => ({ ...RichEditor.PresetTypes.NORMAL, gifts: {} }));
     * ```
     */
    defineType: <T extends Partial<RichInputType>>(getter: () => T) => Readonly<T>;
};

RichEditor.PresetTypes = findByPropsLazy("FORM", "USER_PROFILE");
RichEditor.defineType = <T extends Partial<RichInputType>>(getter: () => T) =>
    proxyLazyWebpack(() => Object.freeze(getter()));
