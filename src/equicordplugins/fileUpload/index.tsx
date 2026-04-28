/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { OpenExternalIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, FluxDispatcher, Menu, PermissionsBits, PermissionStore, React, useEffect, UserStore, useState } from "@webpack/common";

import { settings } from "./settings";
import { serviceLabels, ServiceType } from "./types";
import { getMediaUrl } from "./utils/getMediaUrl";
import { cancelCurrentUpload, getUploadState, isConfigured, subscribeUploadState, uploadFile, uploadPickedFile, uploadProvidedFiles } from "./utils/upload";
const cl = classNameFactory("vc-file-upload-");
const { getUserMaxFileSize } = findByPropsLazy("getUserMaxFileSize");
let uploadAddFilesInterceptor: ((event: unknown) => void) | null = null;
let pasteEventListener: ((event: ClipboardEvent) => void) | null = null;

type UploadAddFilesEvent = {
    type: string;
    files?: unknown;
    uploads?: unknown;
    items?: unknown;
    draftType?: unknown;
    maxFileSize?: unknown;
    fileSizeLimit?: unknown;
    limits?: {
        fileSize?: unknown;
    };
};

function shouldInterceptUploadFiles(files: readonly File[], payload: UploadAddFilesEvent): boolean {
    if (!settings.store.bypassDiscordUploadOnlyOverLimit) return true;

    const directLimit = [payload.maxFileSize, payload.fileSizeLimit, payload.limits?.fileSize].find(limit => Number.isFinite(limit)) as number | undefined;
    const fallbackLimit = getUserMaxFileSize(UserStore.getCurrentUser());
    const discordLimit = Math.max(0, directLimit ?? fallbackLimit);

    return files.some(file => file.size > discordLimit);
}
function extractFilesFromValue(value: unknown): File[] {
    if (value instanceof File) return [value];

    if (!Array.isArray(value)) return [];

    return value.flatMap(entry => {
        if (entry instanceof File) return [entry];

        if (!entry || typeof entry !== "object") return [];

        const uploadFile = "file" in entry ? entry.file : null;
        if (uploadFile instanceof File) return [uploadFile];

        const item = "item" in entry && entry.item && typeof entry.item === "object" ? entry.item : null;
        if (!item || !("file" in item)) return [];

        return item.file instanceof File ? [item.file] : [];
    });
}

function interceptUploadAddFiles(event: unknown): void {
    if (!event || typeof event !== "object" || !("type" in event)) return;

    const payload = event as UploadAddFilesEvent;
    if (payload.type !== "UPLOAD_ATTACHMENT_ADD_FILES") return;

    if (payload.draftType !== DraftType.ChannelMessage) return;

    if (!Boolean((settings.store as { interceptDiscordUpload?: boolean; }).interceptDiscordUpload) || !isConfigured()) return;

    const files = [
        ...extractFilesFromValue(payload.files),
        ...extractFilesFromValue(payload.uploads),
        ...extractFilesFromValue(payload.items)
    ];
    const uniqueFiles = Array.from(new Set(files));

    if (!uniqueFiles.length) return;
    if (!shouldInterceptUploadFiles(uniqueFiles, payload)) return;

    payload.files = [];
    payload.uploads = [];
    payload.items = [];
    void uploadProvidedFiles(uniqueFiles);
}

function handlePaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files || []);
    if (files.length === 0) return;

    if (!settings.store.autoUploadPastedFiles || !isConfigured()) return;

    event.preventDefault();
    event.stopPropagation();

    void uploadProvidedFiles(files);
}

const ProgressBarInner = () => {
    const [state, setState] = useState(getUploadState);

    useEffect(() => subscribeUploadState(() => setState(getUploadState())), []);

    if (state.phase === "idle") return null;

    const percentage = Math.max(0, Math.min(100, state.percent));

    return (
        <div
            className={cl("progress-wrap")}
            data-phase={state.phase}
        >
            <div className={cl("progress-head")}>
                <div className={cl("progress-label")}>
                    {state.status || "Uploading..."}
                </div>
                <div className={cl("progress-meta")}>
                    <span className={cl("progress-attempt")}>
                        {state.attempt > 0 && state.totalAttempts > 0 ? `${state.attempt}/${state.totalAttempts}` : ""}
                    </span>
                    {state.canCancel && (
                        <button
                            className={cl("progress-cancel")}
                            type="button"
                            onClick={cancelCurrentUpload}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
            <div className={cl("progress-track")}>
                <div
                    className={cl("progress-fill")}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className={cl("progress-file")}>
                {state.fileName || ""}{state.currentServiceLabel ? ` • ${state.currentServiceLabel}` : ""}
            </div>
        </div>
    );
};

const ProgressBar = ErrorBoundary.wrap(ProgressBarInner, { noop: true });

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    const { itemSrc, itemHref, target } = props;
    const url = getMediaUrl({ src: itemSrc, href: itemHref, target });

    if (!url) return;

    const group = findGroupChildrenByChildId("open-native-link", children)
        ?? findGroupChildrenByChildId("copy-link", children);

    if (group && !group.some(child => child?.props?.id === "file-upload")) {
        const serviceType = settings.store.serviceType as ServiceType;
        const serviceName = serviceLabels[serviceType];

        group.push(
            <Menu.MenuItem
                label={`Upload to ${serviceName}`}
                key="file-upload"
                id="file-upload"
                action={() => uploadFile(url)}
            />
        );
    }
};

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    if ("href" in props && !props.src) return;

    const url = getMediaUrl(props);
    if (!url) return;

    if (children.some(child => child?.props?.id === "file-upload-group")) return;

    const serviceType = settings.store.serviceType as ServiceType;
    const serviceName = serviceLabels[serviceType];

    children.push(
        <Menu.MenuGroup id="file-upload-group">
            <Menu.MenuItem
                label={`Upload to ${serviceName}`}
                key="file-upload"
                id="file-upload"
                action={() => uploadFile(url)}
            />
        </Menu.MenuGroup>
    );
};

const ExternalIcon = () => <OpenExternalIcon height={24} width={24} />;

const channelAttachMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const channel = props?.channel;
    if (!channel) return;
    if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
    if (children.some(child => child?.props?.id === "file-upload-manual")) return;

    children.splice(1, 0,
        <Menu.MenuItem
            id="file-upload-manual"
            key="file-upload-manual"
            label="Upload to Host"
            iconLeft={ExternalIcon}
            leadingAccessory={{
                type: "icon",
                icon: ExternalIcon
            }}
            action={() => uploadPickedFile()}
        />
    );
};

export default definePlugin({
    name: "FileUpload",
    description: "Upload images and videos to file hosting services like Zipline and Nest",
    tags: ["Media"],
    authors: [EquicordDevs.creations, EquicordDevs.keircn, Devs.ScattrdBlade],
    settings,
    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: {
                match: /(textValue:.{0,50}channelId:\i\.id\}\))(?:,\i(,))?/,
                replace: "$1,$self.renderUploadProgress()$2"
            }
        },
        // forces an early return on the file size limit nitro upsell modal
        {
            find: "#{intl::tRuxk9::raw}",
            replacement: {
                match: /(?<=MAX_FILE_SIZE_250_MB.{0,250})Array\.from\(\i\)\.some/,
                replace: "$self.shouldBypassDiscordUploadSizeCheck()?false:$&"
            }
        },
    ],
    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch,
        "channel-attach": channelAttachMenuPatch
    },
    start() {
        if (uploadAddFilesInterceptor) {
            return;
        }

        uploadAddFilesInterceptor = event => interceptUploadAddFiles(event);
        FluxDispatcher.addInterceptor(uploadAddFilesInterceptor);

        pasteEventListener = event => handlePaste(event);
        document.addEventListener("paste", pasteEventListener, true);
    },
    stop() {
        if (!uploadAddFilesInterceptor) {
            return;
        }

        const index = FluxDispatcher._interceptors.indexOf(uploadAddFilesInterceptor);
        if (index > -1) {
            FluxDispatcher._interceptors.splice(index, 1);
        }

        uploadAddFilesInterceptor = null;

        if (pasteEventListener) {
            document.removeEventListener("paste", pasteEventListener, true);
            pasteEventListener = null;
        }
    },
    shouldBypassDiscordUploadSizeCheck(): boolean {
        return Boolean((settings.store as { interceptDiscordUpload?: boolean; }).interceptDiscordUpload) && isConfigured();
    },
    renderUploadProgress() {
        return <ProgressBar />;
    }
});
