/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./pdfViewer.css";

import { get, set } from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Icons, Spinner, Tooltip, useEffect, useState } from "@webpack/common";

import { LRUCache } from "./cache";

const Native = VencordNative.pluginHelpers.PdfViewer as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    autoEmptyCache: {
        type: OptionType.BOOLEAN,
        description: "Automatically remove the cached PDF file when the component is unmounted. Turning this on will increase load times for PDFs that have already been viewed, but may consume less memory.",
        default: false
    },
    persistPreviewState: {
        type: OptionType.BOOLEAN,
        description: "Persist the state of opened/closed File Previews across channel switches and reloads.",
        default: false
    },
});

const objectUrlsCache = new LRUCache(20);
const STORE_KEY = "PdfViewer_PersistVisible";

interface Attachment {
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    content_type: string;
    content_scan_version: number;
    title: string;
    spoiler: boolean;
    previewBlobUrl?: string;
    previewVisible?: boolean;
}

function FilePreview({ attachment }: { attachment: Attachment; }) {
    const { previewBlobUrl, previewVisible } = attachment;

    if (!previewVisible) return null;

    return (
        <div className={"vc-pdf-viewer-container"}>
            {previewBlobUrl ? <embed src={previewBlobUrl} className="vc-pdf-viewer-preview" title={attachment.filename} /> : <div style={{ display: "flex" }}><Spinner /></div>}
        </div>
    );
}

function PreviewButton({ attachment, channelId, messageId }: { attachment: Attachment; channelId: string; messageId: string; }) {
    const [visible, setVisible] = useState<boolean | null>(null);
    const [url, setUrl] = useState<string>();

    const initPdfData = async () => {
        const cachedUrl = objectUrlsCache.get(attachment.url);
        if (cachedUrl) {
            setUrl(cachedUrl);
            return;
        }
        try {
            const buffer = await Native.getBufferResponse(attachment.url);
            const file = new File([buffer], attachment.filename, { type: attachment.content_type });

            const blobUrl = URL.createObjectURL(file);
            objectUrlsCache.set(attachment.url, blobUrl);
            setUrl(blobUrl);
        } catch (error) {
            console.log(error);
        }
    };

    const updateVisibility = async () => {
        const data: Set<string> = await get(STORE_KEY) ?? new Set();

        if (visible === null) {
            setVisible(settings.store.persistPreviewState ? data.has(attachment.url) : false);
        } else {
            if (visible) data.add(attachment.url);
            else data.delete(attachment.url);

            await set(STORE_KEY, data);

            attachment.previewVisible = visible;
            updateMessage(channelId, messageId);
        }
    };

    useEffect(() => {
        updateVisibility();

        if (visible && !url) initPdfData();
    }, [visible]);

    useEffect(() => {
        attachment.previewBlobUrl = url;
        updateMessage(channelId, messageId);
        return () => {
            if (url && settings.store.autoEmptyCache) {
                objectUrlsCache.delete(attachment.url);
            }
        };
    }, [url]);

    return <Tooltip text={visible ? "Hide File Preview" : "Preview File"}>
        {tooltipProps => (
            <div
                {...tooltipProps}
                className="vc-pdf-viewer-toggle"
                role="button"
                onClick={() => {
                    setVisible(v => !v);
                }}
            >
                {visible ? <Icons.EyeSlashIcon /> : <Icons.EyeIcon />}
            </div>
        )}
    </Tooltip>;
}

export default definePlugin({
    name: "PdfViewer",
    description: "Preview PDF Files without having to download them",
    authors: [Devs.AGreenPig],
    dependencies: ["MessageAccessoriesAPI", "MessageUpdaterAPI",],
    settings,
    patches: [
        {
            find: "Messages.IMG_ALT_ATTACHMENT_FILE_TYPE.format",
            replacement: {
                match: /newMosaicStyle,\i\),children:\[(?<=}=(\i);.+?)/,
                replace: "$&$self.renderPreviewButton($1),"
            }
        }
    ],
    start() {
        addAccessory("pdfViewer", props => {
            const pdfAttachments = props.message.attachments.filter(a => a.content_type === "application/pdf");
            if (!pdfAttachments.length) return null;

            return (
                <ErrorBoundary>
                    {pdfAttachments.map((attachment, index) => (
                        <FilePreview key={index} attachment={attachment} />
                    ))}
                </ErrorBoundary>
            );
        }, -1);
    },
    renderPreviewButton: ErrorBoundary.wrap(e => {
        if (e.item.originalItem.content_type !== "application/pdf") return null;
        return <PreviewButton attachment={e.item.originalItem} channelId={e.message.channel_id} messageId={e.message.id} />;
    }),
    stop() {
        objectUrlsCache.clear();
        removeAccessory("pdfViewer");
    }
});
