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
import { CloudUpload } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, DraftType, FluxDispatcher, GuildStore, Menu, PermissionsBits, PermissionStore, React, showToast, UploadAttachmentStore, useEffect, UserStore, useState } from "@webpack/common";

import { settings } from "./settings";
import { serviceLabels, ServiceType } from "./types";
import { getMediaUrl } from "./utils/getMediaUrl";
import { cancelCurrentUpload, getUploadState, isConfigured, isFileTypeAllowed, logger, subscribeUploadState, uploadFile, uploadPickedFile, uploadProvidedFiles } from "./utils/upload";
const cl = classNameFactory("vc-file-upload-");
const DiscordFileLimits = findByPropsLazy("getUserMaxFileSize");
let uploadAddFilesInterceptor: ((event: unknown) => void) | null = null;
let pasteEventListener: ((event: ClipboardEvent) => void) | null = null;

type UploadAddFilesEvent = {
    type: string;
    channelId?: unknown;
    guildId?: unknown;
    channel?: unknown;
    guild?: unknown;
    files?: unknown;
    uploads?: unknown;
    items?: unknown;
    draftType?: unknown;
    maxFileSize?: unknown;
    fileSizeLimit?: unknown;
    maxFileBytes?: unknown;
    fileSizeBytes?: unknown;
    limits?: {
        fileSize?: unknown;
        maxFileSize?: unknown;
    };
};

function toFiniteLimit(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function getPayloadChannelId(payload: UploadAddFilesEvent): string | undefined {
    if (typeof payload.channelId === "string" && payload.channelId !== "") return payload.channelId;

    const { channel } = payload;
    if (channel && typeof channel === "object" && "id" in channel && typeof channel.id === "string") return channel.id;

    return undefined;
}

function getGuildIdForPayload(payload: UploadAddFilesEvent, channelId: string | undefined): string | undefined {
    if (typeof payload.guildId === "string" && payload.guildId !== "") return payload.guildId;

    const { guild } = payload;
    if (guild && typeof guild === "object" && "id" in guild && typeof guild.id === "string") return guild.id;

    const { channel } = payload;
    if (channel && typeof channel === "object") {
        if ("guild_id" in channel && typeof channel.guild_id === "string") return channel.guild_id;
        if ("guildId" in channel && typeof channel.guildId === "string") return channel.guildId;
    }

    if (channelId) {
        const guildId = ChannelStore.getChannel(channelId)?.guild_id;
        if (typeof guildId === "string") return guildId;
    }

    return undefined;
}

function getDiscordChannelLimit(channelId: string | undefined): number | undefined {
    if (!channelId) return undefined;

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return undefined;

    const channelGetter = DiscordFileLimits.getChannelMaxFileSize;
    if (typeof channelGetter !== "function") return undefined;

    return toFiniteLimit(channelGetter(channel));
}

function getDiscordGuildLimit(guildId: string | undefined): number | undefined {
    if (!guildId) return undefined;

    const guild = GuildStore.getGuild(guildId);
    if (!guild) return undefined;

    const guildGetter = DiscordFileLimits.getGuildMaxFileSize;
    if (typeof guildGetter === "function") {
        const limit = toFiniteLimit(guildGetter(guild));
        if (limit !== undefined) return limit;
    }

    const { features } = guild;
    const featureNames: string[] = features instanceof Set ? Array.from(features) : Array.isArray(features) ? [...features] : [];
    if (featureNames.includes("MAX_FILE_SIZE_100_MB")) return 100 * 1024 * 1024;
    if (featureNames.includes("MAX_FILE_SIZE_50_MB")) return 50 * 1024 * 1024;
    return undefined;
}

function getManualLimitBytes(): number | undefined {
    const manualMB = settings.store.customDiscordFileSizeLimitMB;
    if (typeof manualMB !== "number" || !Number.isFinite(manualMB) || manualMB <= 0) return undefined;
    return manualMB * 1024 * 1024;
}

function shouldInterceptUploadFiles(files: readonly File[], payload: UploadAddFilesEvent): boolean {
    if (!settings.store.bypassDiscordUploadOnlyOverLimit) return true;

    const directLimit = [
        payload.maxFileSize,
        payload.fileSizeLimit,
        payload.maxFileBytes,
        payload.fileSizeBytes,
        payload.limits?.fileSize,
        payload.limits?.maxFileSize
    ].map(toFiniteLimit).find(limit => limit !== undefined);
    if (directLimit !== undefined) return files.some(file => file.size > directLimit);

    const manualLimit = getManualLimitBytes();
    if (manualLimit !== undefined) return files.some(file => file.size > manualLimit);

    const channelId = getPayloadChannelId(payload);
    const guildId = getGuildIdForPayload(payload, channelId);
    const candidates = [
        getDiscordChannelLimit(channelId),
        getDiscordGuildLimit(guildId),
        toFiniteLimit(DiscordFileLimits.getUserMaxFileSize(UserStore.getCurrentUser()))
    ].filter((limit): limit is number => limit !== undefined);
    if (!candidates.length) return false;

    return files.some(file => file.size > Math.max(...candidates));
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

    if (!settings.store.bypassDiscordUpload || !isConfigured()) return;

    const files = [
        ...extractFilesFromValue(payload.files),
        ...extractFilesFromValue(payload.uploads),
        ...extractFilesFromValue(payload.items)
    ];
    const uniqueFiles = Array.from(new Set(files)).filter(f => isFileTypeAllowed(f));

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

    const allowed = files.filter(f => isFileTypeAllowed(f));
    if (allowed.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    void uploadProvidedFiles(allowed);
}

function formatBytes(bytes: number): string {
    if (!bytes) return "";

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const ProgressBarInner = () => {
    const [state, setState] = useState(getUploadState);

    useEffect(() => subscribeUploadState(() => setState(getUploadState())), []);

    if (state.phase === "idle") return null;

    const percentage = Math.max(0, Math.min(100, state.percent));
    const progressLabel = state.totalBytes > 0
        ? `${Math.round(percentage)}% - ${formatBytes(state.transferredBytes)} of ${formatBytes(state.totalBytes)}`
        : `${Math.round(percentage)}%`;

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
                    <span className={cl("progress-percent")}>
                        {progressLabel}
                    </span>
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

async function handleUploadFileFromDraft(upload: CloudUpload) {
    const file = upload.item?.file;
    if (!file) return;

    if (!isFileTypeAllowed(file)) {
        showToast({ text: "File type not allowed by current filter", variant: "critical" });
        return;
    }

    if (!isConfigured()) {
        showToast({ text: "Please configure FileUpload settings first", variant: "critical" });
        return;
    }

    try {
        await uploadProvidedFiles([file], true);
        upload.removeFromMsgDraft();
    } catch (e) {
        logger.warn("Draft upload encountered an unexpected error", e);
    }
}

const ExternalIcon = () => <OpenExternalIcon height={24} width={24} />;

const channelAttachMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const channel = props?.channel;
    if (!channel) return;
    if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
    if (children.some(child => child?.props?.id === "file-upload-manual" || child?.props?.id === "file-upload-uploads")) return;

    const uploads = UploadAttachmentStore.getUploads(channel.id, DraftType.ChannelMessage);
    const draftUploads = Array.isArray(uploads) ? uploads.filter((u: CloudUpload) => u.item?.file && isFileTypeAllowed(u.item.file)) : [];

    if (draftUploads.length > 0) {
        children.splice(1, 0,
            <Menu.MenuItem
                id="file-upload-uploads"
                key="file-upload-uploads"
                label="Upload to Host"
                iconLeft={ExternalIcon}
                leadingAccessory={{
                    type: "icon",
                    icon: ExternalIcon
                }}
            >
                {draftUploads.map((upload: CloudUpload) => (
                    <Menu.MenuItem
                        id={`file-upload-draft-${upload.id}`}
                        key={upload.id}
                        label={upload.filename}
                        action={() => handleUploadFileFromDraft(upload)}
                    />
                ))}
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    id="file-upload-manual"
                    key="file-upload-manual"
                    label="Choose File..."
                    action={() => uploadPickedFile()}
                />
            </Menu.MenuItem>
        );
    } else {
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
    }
};

export default definePlugin({
    name: "FileUpload",
    description: "Upload files to hosting services like Zipline, Nest, S3, and WebDAV",
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
            find: "#{intl::UPLOAD_AREA_TOO_LARGE_HELP_PREMIUM_TIER_1}",
            replacement: {
                match: /(?<=#{intl::UPLOAD_AREA_TOO_LARGE_HELP}.{0,250})Array\.from\(\i\)\.some/,
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
        return Boolean(settings.store.bypassDiscordUpload) && isConfigured();
    },
    renderUploadProgress() {
        return <ProgressBar />;
    }
});
