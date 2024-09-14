/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./fileViewer.css";

import { get, set } from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PreviewInvisible, PreviewVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Tooltip, useEffect, useState } from "@webpack/common";

import { LRUCache } from "./cache";

const Native = VencordNative.pluginHelpers.FileViewer as PluginNative<typeof import("./native")>;

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
    cacheSize: {
        type: OptionType.SLIDER,
        description: "Maximum number of PDF files to cache (after that, the least recently used file will be removed). Lower this value if you're running out of memory.",
        default: 50,
        restartNeeded: true,
        markers: [10, 20, 30, 40, 50, 75, 100],
        stickToMarkers: true,
    }
});

const objectUrlsCache = new LRUCache();
const STORE_KEY = "FileViewer_PersistVisible";

let style: HTMLStyleElement;

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
}

const stripLink = (url: string) => url.replace("https://cdn.discordapp.com/attachments/", "").split("/").slice(0, 2).join("-");
function FilePreview({ attachment }: { attachment: Attachment; }) {
    const { previewBlobUrl } = attachment;

    if (!previewBlobUrl) return null;

    return <div className={"file-viewer container"} id={`file-viewer-${stripLink(attachment.url)}`}><embed src={previewBlobUrl} className="file-viewer preview" title={attachment.filename} /></div>;
}

async function buildCss() {
    const visiblePreviews: Set<string> | undefined = await get(STORE_KEY);
    const elements = [...(visiblePreviews || [])].map(url => `#file-viewer-${stripLink(url)}`).join(",");
    style.textContent = `
    :is(${elements})  {
        display: flex !important;
    }
    `;
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

    useEffect(() => {
        get(STORE_KEY).then(async data => {
            if (visible === null) {
                setVisible(settings.store.persistPreviewState ? (data ?? new Set()).has(attachment.url) : false);
            } else {
                const persistSet = (data ?? new Set());
                if (visible) persistSet.add(attachment.url);
                else persistSet.delete(attachment.url);
                await set(STORE_KEY, persistSet);
                buildCss();
            }
        });
        if (visible && !url) initPdfData();
    }, [visible]);

    useEffect(() => {
        attachment.previewBlobUrl = url;
        updateMessage(channelId, messageId,);
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
                className="file-viewer toggle"
                role="button"
                onClick={() => {
                    setVisible(v => !v);
                }}
            >
                {visible ? <PreviewInvisible /> : <PreviewVisible />}
            </div>
        )}
    </Tooltip>;
}

export default definePlugin({
    name: "FileViewer",
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
        objectUrlsCache.setMaxSize(Math.round(settings.store.cacheSize));
        new Logger("FileViewer").info(`Initialized LRU Cache with size ${objectUrlsCache.getMaxSize()}`);
        addAccessory("fileViewer", props => {
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

        style = document.createElement("style");
        style.id = "VencordFileViewer";
        document.head.appendChild(style);
    },
    renderPreviewButton(e) {
        if (e.item.originalItem.content_type !== "application/pdf") return null;
        return <PreviewButton attachment={e.item.originalItem} channelId={e.message.channel_id} messageId={e.message.id} />;
    },
    stop() {
        objectUrlsCache.clear();
        removeAccessory("fileViewer");
        style.remove();
    }
});
