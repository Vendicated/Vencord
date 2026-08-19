/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { LazyComponentWrapper } from "@utils/lazyReact";
import { Embed, ListRow, Message, MessageAttachment, ScrollerBaseRef } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { findByCodeLazy, findComponentByCode, findComponentByCodeLazy, findCssClassesLazy, proxyLazyWebpack } from "@webpack";
import { ChannelStore, ExpressionPickerStore, ListScrollerThin, lodash, PermissionsBits, PermissionStore, React, useCallback, useEffect, useMemo, useRef, useState, useStateFromStores } from "@webpack/common";
import { ComponentProps, ReactNode } from "react";

import { SignedUrlsStore } from "./stores";
import { AttachmentContextProviderProps, AttachmentItem, AttachmentsComponentProps, CustomItemFormat, FavoriteButtonProps, FavouriteItemFormat, FilePickerItemProps, FilePickerProps, ManaSearchBarProps, MessageComponentClass, StaticFilePickerItemProps } from "./types";
import { cl, getFilenameAndExtension, getFileThumbnailUrl, hasPermission, ImageUtils, sendAttachment, transformAttachment, useFavourites, useListScroller, useResizeObserver } from "./utils";

export const EmbedContext = proxyLazyWebpack(() => React.createContext<null | Embed>(null));
export const EmbedMosaicContext = proxyLazyWebpack(() => React.createContext<null | number>(null));
const AttachmentContext = proxyLazyWebpack(() => React.createContext<null | AttachmentItem>(null));

const ManaSearchBar = findComponentByCodeLazy<ManaSearchBarProps>("#{intl::SEARCH}),ref");
const FavoriteButton = findComponentByCodeLazy<FavoriteButtonProps>("#{intl::GIF_TOOLTIP_ADD_TO_FAVORITES}");

const createChannelRecordFromServer = findByCodeLazy(".GUILD_TEXT]", "fromServer)");
const createMessageRecord = findByCodeLazy(".createFromServer(", ".isBlockedForMessage", "messageReference:");

const Classes = findCssClassesLazy("gifFavoriteButton", "ctaButtonContainer");

function createPreviewMessage(attachment: MessageAttachment, channelId: string) {
    const previewMessage = {
        id: `favourite-anything-preview-${attachment.id}`,
        attachments: [attachment],
        channel_id: channelId,
        content: "",
        type: 0,
        timestamp: new Date().toISOString()
    };

    return createMessageRecord(previewMessage) as Message;
}

export const AttachmentPreview = proxyLazyWebpack(() => {
    // findComponentByCodeLazy doesn't work properly with component classes, this must be kept within the lazy scope
    const MessageComponent = findComponentByCode("this.renderAttachments") as LazyComponentWrapper<MessageComponentClass>;

    class MessageAttachmentsComponent extends MessageComponent {
        render(): ReactNode {
            return this.renderAttachments(this.props.message);
        }
    }

    const channel = Object.freeze(createChannelRecordFromServer({ id: "0", type: ChannelType.GUILD_TEXT }));

    return function AttachmentPreview({ attachment }: AttachmentsComponentProps) {
        const message = useMemo(
            () => createPreviewMessage(attachment, channel.id),
            [attachment, channel.id]
        );

        return (
            <MessageAttachmentsComponent
                channel={channel}
                message={message}
                canDeleteAttachments={false}
                shouldHideMediaOptions={false}
                inlineAttachmentMedia
            />
        );
    };
});

export function FilePicker({ onSelectItem }: FilePickerProps) {
    const listRef = useRef<ScrollerBaseRef>(null);

    const { channelId, query } = ExpressionPickerStore.useExpressionPickerStore(store => ({
        channelId: store.activeChannelId as string,
        query: store.searchQuery
    }));

    const channel = useStateFromStores([ChannelStore], () => ChannelStore.getChannel(channelId), [channelId]);

    const favs = useFavourites(CustomItemFormat.ATTACHMENT, query);
    const count = useMemo(() => (favs ? Object.keys(favs).length : 0), [favs]);

    const [rowHeights, handleResize] = useListScroller();

    const handleSubmit = useCallback((url: string) => onSelectItem({ url }), []);
    const handleChange = useCallback((query: string) => ExpressionPickerStore.setSearchQuery(query), []);
    const handleClear = useCallback(() => ExpressionPickerStore.setSearchQuery(""), []);

    const renderRow = useCallback(({ row }: ListRow) => {
        const item = favs?.[row];
        if (!item) return null;

        return (
            <FilePickerItem
                key={item.url}
                url={item.url}
                file={item.data}
                channel={channel}
                reducePadding={row !== count - 1}
                onResize={handleResize}
                onSubmit={handleSubmit}
            />
        );
    }, [favs, channel, count, handleResize, handleSubmit]);

    const rowHeight = useCallback(
        (_: number, row: number) => (favs?.[row] && rowHeights.get(favs[row].url)) ?? 100,
        [favs, rowHeights]
    );

    useEffect(() => void listRef.current?.scrollToTop(), [query]);

    return (
        <div id="files-picker-tab-panel" role="tabpanel" aria-labelledby="files-picker-tab" className={cl("container")}>
            <div className={cl("container-header")}>
                <ManaSearchBar autoFocus placeholder="Search files" query={query} onChange={handleChange} onClear={handleClear} />
            </div>
            {count > 0 ? (
                <div className={cl("container-body")}>
                    <ListScrollerThin ref={listRef} sections={[count]} sectionHeight={0} rowHeight={rowHeight} renderRow={renderRow} />
                </div>
            ) : (
                <div className={cl("container-body", "container-info")} inert>
                    {query.trim() ? <EmptyList /> : <Demo />}
                </div>
            )}
        </div>
    );
}

function EmptyList() {
    return <BaseText className={cl("info-text")}>No files match your search.</BaseText>;
}

const demoAttachment: MessageAttachment = {
    id: "1",
    filename: "file",
    content_type: "application/octet-stream",
    size: 123 * 1024,
    spoiler: false,
    url: "",
    proxy_url: ""
};

function Demo() {
    return (
        <>
            <div className={cl("attachment-container", "demo", "first")}>
                <AttachmentPreview attachment={demoAttachment} />
                <FavoriteButton
                    className={cl("demo-favourite-button")}
                    url="https://example.org"
                    src="https://example.org"
                    width={100}
                    height={100}
                    format={FavouriteItemFormat.NONE}
                />
            </div>
            <BaseText className={cl("info-text")} size="md">
                Click the star to favourite a file.
                <br />
                Favourite files will show up here!
            </BaseText>
        </>
    );
}

function SendIcon({ height = 24, width = 24, ...props }: ComponentProps<"svg">) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M6.6 10.02 14 11.4a.6.6 0 0 1 0 1.18L6.6 14l-2.94 5.87a1.48 1.48 0 0 0 1.99 1.98l17.03-8.52a1.48 1.48 0 0 0 0-2.64L5.65 2.16a1.48 1.48 0 0 0-1.99 1.98l2.94 5.88Z" />
        </svg>
    );
}

export function StaticFilePickerItem({ name, subtitle }: StaticFilePickerItemProps) {
    const [, ext] = getFilenameAndExtension(name);

    // Keep this compact! Long prop names, styles, numbers, etc could be wasteful
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 32 11" style={{ font: "2px sans-serif" }} fill="#242429">
            <path d="M-2-2h32v11H-2" />
            <rect width="5" height="7" rx=".5" fill="#ddf" />
            <g fill="#78e">
                <path d="M3-1v2.5q0 .5.5.5H6" />
                {ext && <text x=".85" y="6" fontFamily="monospace">{ext.slice(1, 4)}</text>}
            </g>
            <path d="M6 3V-2H1" />
            <text x="7" y="2.8" fill="#eff">{name}</text>
            <text x="7" y="5.6" fill="#777">{subtitle}</text>
        </svg>
    );
}

export function FilePickerItem({ url, file, channel, onResize, onSubmit, reducePadding }: FilePickerItemProps) {
    const [isFetching, setIsFetching] = useState(false);

    const ref = useRef<HTMLDivElement>(null);
    useResizeObserver(ref, ({ height }) => onResize(url, height), [onResize, url]);

    const attachment = useStateFromStores(
        [SignedUrlsStore],
        () => ({ ...file, url: SignedUrlsStore.get(file.url), proxy_url: SignedUrlsStore.get(file.proxy_url) }),
        [file],
        lodash.isEqual
    ) as MessageAttachment;

    const { canAttachFiles, canSendMessages } = useStateFromStores(
        [PermissionStore],
        () => ({
            canAttachFiles: hasPermission(PermissionsBits.ATTACH_FILES, channel),
            canSendMessages: hasPermission(PermissionsBits.SEND_MESSAGES, channel)
        }),
        [channel]
    );

    const handleClick = useMemo(() => {
        switch (true) {
            case canAttachFiles:
                return async () => {
                    setIsFetching(true);
                    await sendAttachment(attachment, channel!);
                    ExpressionPickerStore.closeExpressionPicker();
                    setIsFetching(false);
                };
            case canSendMessages:
                return () => onSubmit(url);
            default:
                return null;
        }
    }, [attachment, canAttachFiles, canSendMessages, channel, url]);

    return (
        <div ref={ref} className={cl("attachment-container", reducePadding && "reduced-padding")}>
            <AttachmentPreview attachment={attachment} />
            {handleClick && (
                <Button onClick={handleClick} variant="secondary" disabled={isFetching}>
                    <SendIcon width={20} height={20} />
                </Button>
            )}
        </div>
    );
}

export function EmbedAccessory() {
    const embed = React.useContext(EmbedContext);
    const mosaicIndex = React.useContext(EmbedMosaicContext);

    const props: FavoriteButtonProps | null = useMemo(() => {
        if (!embed || embed.type === "gifv") return null;

        const { video, image, images, thumbnail } = embed;

        if (video) {
            // This field is missing on videos by third party providers (TikTok, YouTube ...)
            const isProxiedVideo = !!video.proxyURL;

            // External videos don't have a video.proxyURL property that could be used for the preview - use the static thumbnail instead
            const src = video.proxyURL ?? thumbnail?.proxyURL ?? video.url;
            const format = isProxiedVideo ? FavouriteItemFormat.VIDEO : FavouriteItemFormat.IMAGE;

            // External videos' content.url usually doesn't point to a valid resource that could be embedded
            const url = !isProxiedVideo ? embed.url! : video.url;

            return { ...video, format, src, url };
        }

        const img = (mosaicIndex != null && images?.[mosaicIndex]) || image;
        if (!img) return null;

        const src = img.proxyURL ?? img.url;

        // Do not render the custom embed accessory if the original image already has a gif accessory
        const isAnimated = ImageUtils.isAnimated({ ...img, original: img.url, src, animated: false });
        if (isAnimated) return null;

        return { ...img, format: FavouriteItemFormat.IMAGE, src };
    }, [embed, mosaicIndex]);

    return (
        props && (
            <div className={cl("image-accessory")}>
                <FavoriteButton {...props} className={Classes.gifFavoriteButton} />
            </div>
        )
    );
}

export function AttachmentContextProvider({ attachment, component, children }: AttachmentContextProviderProps) {
    const attachmentItem: AttachmentItem | null = useMemo(() => {
        if (component) {
            const { id, size, name, spoiler, file } = component;
            const raw = {
                ...file,
                size,
                filename: name,
                id,
                spoiler,
                content_type: file.contentType,
                proxy_url: file.proxyUrl
            };

            return transformAttachment(raw);
        }

        if (attachment) {
            const { originalItem, ...rest } = attachment;

            // Regular media attachments and cv2 media attachments are structured differently
            const raw: MessageAttachment =
                "media" in originalItem
                    ? {
                        ...originalItem.media,
                        id: rest.uniqueId,
                        size: 0,
                        spoiler: rest.spoiler,
                        filename: (rest.spoiler ? "SPOILER_" : "") + rest.uniqueId,
                        content_type: originalItem.media.contentType,
                        proxy_url: originalItem.media.proxyUrl
                    }
                    : originalItem;

            return { originalItem: raw, ...rest };
        }

        return null;
    }, [attachment, component]);

    return <AttachmentContext.Provider value={attachmentItem}>{children}</AttachmentContext.Provider>;
}

const visualMediaFormats: Partial<Record<AttachmentItem["type"], FavouriteItemFormat>> = Object.freeze({
    IMAGE: FavouriteItemFormat.IMAGE,
    VIDEO: FavouriteItemFormat.VIDEO,
    CLIP: FavouriteItemFormat.VIDEO
});

export function AttachmentAccessory() {
    const attachment = React.useContext(AttachmentContext);

    const props: FavoriteButtonProps | null = useMemo(() => {
        if (!attachment?.downloadUrl) return null;
        const { originalItem, type, downloadUrl, srcIsAnimated } = attachment;
        const width = attachment.width || 160, height = attachment.height || 55;

        // Do not render the custom accessory if the original attachment component already has a gif accessory
        const isAnimated = ImageUtils.isAnimated({ original: originalItem.url, src: originalItem.proxy_url, animated: false, srcIsAnimated });
        if (isAnimated) return null;

        if (type in visualMediaFormats) {
            return { format: visualMediaFormats[type]!, src: originalItem.proxy_url, url: downloadUrl, width, height };
        }

        const gifSrc = Object.assign(
            () => getFileThumbnailUrl(originalItem).then(url => url.toString()),
            { [Symbol.toPrimitive]: () => "" }
        );
        return { format: FavouriteItemFormat.NONE, src: originalItem.proxy_url, url: downloadUrl, width, height, gifSrc };
    }, [attachment]);

    return props && <FavoriteButton {...props} className={cl("attachment-accessory")} />;
}
