/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Channel, Embed, EmbedJSON, Message, MessageAttachment, TextInput } from "@vencord/discord-types";
import { Component, ComponentClass, ComponentProps, ComponentPropsWithRef, Key, PropsWithChildren, ReactNode, RefObject } from "react";
import { JsonValue, PartialDeep } from "type-fest";

export enum ExpressionPickerView {
    EMOJI = "emoji",
    GIF = "gif",
    STICKER = "sticker",
    SOUNDBOARD = "soundboard",
    FILES = "files"
}

export interface ExpressionPickerTabProps extends PropsWithChildren {
    id?: string;
    "aria-controls"?: string;
    "aria-selected"?: boolean;
    isActive?: boolean;
    viewType: ExpressionPickerView;
}

export interface FavoriteButtonProps extends Omit<FavouriteItem, "order"> {
    url: string;
    gifSrc?: string;
    className?: string;
}

// Partial type, renderAttachments only uses a few props
interface MessageComponentProps {
    message: Message;
    channel: Channel;
    gifAutoPlay?: boolean;
    canDeleteAttachments?: boolean;
    shouldHideMediaOptions?: boolean;
    inlineAttachmentMedia?: boolean;
}

export interface MessageComponentClass extends Omit<ComponentClass<MessageComponentProps>, "new"> {
    new(props: MessageComponentProps): Component<MessageComponentProps> & {
        renderAttachments(message: Partial<Message>): ReactNode;
    };
}

export interface ManaSearchBarProps extends Pick<
    ComponentPropsWithRef<TextInput>,
    "autoFocus" | "placeholder" | "onKeyDown" | "disabled" | "onChange" | "onBlur" | "onFocus" | "autoComplete" | "ref"
> {
    query?: string;
    onClear?: () => void;
    inputProps?: ComponentProps<TextInput>;
}

export interface FilePickerProps {
    onSelectItem: (item: { url: string; }) => void;
}

export interface FilePickerItemProps {
    url: string;
    file: MessageAttachment;
    channel: Channel | null;
    reducePadding?: boolean;
    onResize: (key: Key, height: number) => void;
    onSubmit: (url: string) => void;
}

export interface AttachmentsComponentProps {
    attachment: MessageAttachment;
}

export interface AttachmentContextProviderProps extends PropsWithChildren {
    attachment?: AttachmentItem<MessageAttachment | { media: CV2Attachment; }>;
    component?: { id: string; size: number; name: string; spoiler: boolean; file: CV2Attachment; };
}

export interface EmbedComponent extends Component<{ embed: Embed; }> {
    __render: () => ReactNode;
}

export interface AttachmentItem<TOriginal = MessageAttachment> {
    contentType: string;
    type: "IMAGE" | "VIDEO" | "CLIP" | "AUDIO" | "VISUAL_PLACEHOLDER" | "PLAINTEXT_PREVIEW" | "OTHER" | "INVALID";
    width?: number;
    height?: number;
    downloadUrl: string;
    spoiler: boolean;
    srcIsAnimated: boolean;
    uniqueId: string;
    originalItem: TOriginal;
}

export interface CV2Attachment {
    url: string;
    proxyUrl: string;
    width: number;
    height: number;
    placeholder?: string;
    contentType: string;
    flags: number;
}

export enum FavouriteItemFormat {
    NONE = 0,
    IMAGE = 1,
    VIDEO = 2
}

export interface FavouriteItem {
    format: FavouriteItemFormat;
    src: string;
    width: number;
    height: number;
    order: number;
}

export enum CustomItemFormat {
    ATTACHMENT = 0
}

export interface CustomItemDef<A = any, B extends JsonValue = any> {
    encode: (data: A) => B | null;
    decode: (data: PartialDeep<B, { recurseIntoArrays: true; }>) => NoInfer<A> | null;
    stringify: (data: A) => string;
}

export type ItemsDef<T> = T & {
    [K in keyof T]: T[K] extends CustomItemDef<infer A, infer B> ? CustomItemDef<A, B> : never;
};

export interface RefreshedUrlsResponse {
    refreshed_urls: [
        {
            original: string;
            refreshed: string | null;
        }
    ];
}

export interface UnfurledEmbedsResponse {
    embeds: EmbedJSON[];
}

export type ResizeObserverHook = (
    ref: RefObject<Element | null>,
    callback: (size: { width: number; height: number; }) => void,
    deps?: unknown[]
) => void;

export interface ImageUtils {
    isAnimated(image: { src: string; original?: string; animated: boolean; srcIsAnimated?: boolean; }): boolean;
}

export type AttachmentTransformer = (attachment: MessageAttachment, inlineAttachmentMedia?: boolean) => AttachmentItem;
