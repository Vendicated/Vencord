/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { LazyComponentWrapper } from "@utils/lazyReact";
import { Message, MessageAttachment, ScrollerBaseRef } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { findByCodeLazy, findComponentByCode, findComponentByCodeLazy, findCssClassesLazy, proxyLazyWebpack } from "@webpack";
import { ChannelStore, ExpressionPickerStore, ListScrollerThin, lodash, PermissionsBits, PermissionStore, React, useCallback, useEffect, useMemo, useRef, useState, useStateFromStores } from "@webpack/common";
import { ReactNode } from "react";

import { AttachmentContext, EmbedContext, EmbedMosaicContext } from ".";
import { SignedUrlsStore } from "./stores";
import { AttachmentItem, AttachmentsComponentProps, CustomItemFormat, FavoriteButtonProps, FavouriteItemFormat, FilePickerItemProps, FilePickerProps, ManaSearchBarProps, MessageComponentClass } from "./types";
import { cl, defs, hasPermission, ImageUtils, sendAttachment, useFavourites, useListScroller, useResizeObserver } from "./utils";

const ManaSearchBar = findComponentByCodeLazy<ManaSearchBarProps>("#{intl::SEARCH}),ref");
const FavoriteButton = findComponentByCodeLazy<FavoriteButtonProps>("#{intl::GIF_TOOLTIP_ADD_TO_FAVORITES}");
const SendIcon = findComponentByCodeLazy("M6.6 10.02 14 11.4a.6.6");

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

    const renderRow = (row: number) => {
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
    };

    useEffect(() => void listRef.current?.scrollToTop(), [query]);

    return (
        <div id="files-picker-tab-panel" role="tabpanel" aria-labelledby="files-picker-tab" className={cl("container")}>
            <div className={cl("container-header")}>
                <ManaSearchBar
                    autoFocus
                    placeholder="Search files"
                    query={query}
                    onChange={query => ExpressionPickerStore.setSearchQuery(query)}
                    onClear={() => ExpressionPickerStore.setSearchQuery("")}
                />
            </div>
            {count > 0 ? (
                <div className={cl("container-body")}>
                    <ListScrollerThin
                        ref={listRef}
                        sections={[count]}
                        sectionHeight={0}
                        rowHeight={(_, row) => (favs?.[row] && rowHeights.get(favs[row].url)) ?? 100}
                        renderSection={() => null}
                        renderRow={({ row }) => renderRow(row)}
                    />
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
            <BaseText className={cl("info-text")}>
                Click the star to favourite a file.
                <br />
                Favourite files will show up here!
            </BaseText>
        </>
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
                    <SendIcon size="refresh_sm" color="currentColor" />
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

const visualMediaFormats: Partial<Record<AttachmentItem["type"], FavouriteItemFormat>> = Object.freeze({
    IMAGE: FavouriteItemFormat.IMAGE,
    VIDEO: FavouriteItemFormat.VIDEO,
    CLIP: FavouriteItemFormat.VIDEO
});

export function AttachmentAccessory() {
    const attachment = React.useContext(AttachmentContext);

    const props: FavoriteButtonProps | null = useMemo(() => {
        if (!attachment?.downloadUrl) return null;
        const { originalItem, type, downloadUrl, width = 600, height = 400, srcIsAnimated } = attachment;

        // Do not render the custom accessory if the original attachment component already has a gif accessory
        const isAnimated = ImageUtils.isAnimated({
            original: originalItem.url,
            src: originalItem.proxy_url,
            animated: false,
            srcIsAnimated
        });
        if (isAnimated) return null;

        if (type in visualMediaFormats) {
            return { format: visualMediaFormats[type]!, src: originalItem.proxy_url, url: downloadUrl, width, height };
        }

        // Non visual attachments have to be encoded to store metadata in the src property.
        // Note that this isn't a valid url yet, the full url (with a fallback image for vanilla client compat)
        // is generated via `getThumbnailUrl` once the user clicks the favourite button
        const src = defs.encode(CustomItemFormat.ATTACHMENT, originalItem)?.toString();
        if (!src) return null;

        return { format: FavouriteItemFormat.NONE, src, url: downloadUrl, width, height };
    }, [attachment]);

    return props && <FavoriteButton {...props} className={cl("attachment-accessory")} />;
}
