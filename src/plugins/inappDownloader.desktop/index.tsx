/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 .skyade
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { CloudDownloadIcon } from "@components/Icons";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { Button, ChannelStore, Menu, showToast, Text, Toasts, useEffect, useState } from "@webpack/common";

const Native = VencordNative.pluginHelpers.InappDownloader as PluginNative<typeof import("./native")>;
const logger = new Logger("InappDownloader");

const DIRECTORY_KEY = "InappDownloader_Directory";
const LEGACY_DIRECTORY_KEY = "DiscordInAppDownloader_Directory";
const MAX_ATTACHMENTS_PER_ACTION = 25;
let pluginRunning = false;

type DownloadFolderMode = "specified" | "downloads" | "ask";

const settings = definePluginSettings({
    downloadFolderMode: {
        type: OptionType.SELECT,
        description: "Where to save attachments",
        options: [
            { label: "Specified folder", value: "specified", default: true },
            { label: "System Downloads", value: "downloads" },
            { label: "Ask every time", value: "ask" },
        ],
        onChange() {
            if (pluginRunning) void updateNativeDownloadInterception();
        },
    },
    specifiedDownloadFolder: {
        type: OptionType.COMPONENT,
        component: DownloadFolderSetting,
    },
    interceptDownloadButtons: {
        type: OptionType.BOOLEAN,
        description: "Intercept Discord desktop attachment downloads",
        default: true,
        onChange(enabled: boolean) {
            if (!pluginRunning) return;
            if (enabled) installDownloadButtonInterception();
            else uninstallDownloadButtonInterception();
            void updateNativeDownloadInterception(enabled);
        },
    },
});

type Attachment = Message["attachments"][number];
type DownloadableAttachment = Pick<Attachment, "url" | "filename">;

let downloadDirectory: string | undefined;
let directoryReady: Promise<void> | undefined;
const activePolls = new Set<string>();
let originalWindowOpen: typeof window.open | undefined;
let interceptedWindowOpen: typeof window.open | undefined;
let documentClickHandler: ((event: MouseEvent) => void) | undefined;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function hasDownloadableAttachments(message: Message) {
    return message.attachments?.some(attachment =>
        typeof attachment?.url === "string" && typeof attachment?.filename === "string"
    ) ?? false;
}

function getAttachmentFromMessage(message: Message) {
    return message.attachments
        .filter(attachment =>
            typeof attachment?.url === "string" && typeof attachment?.filename === "string"
        )
        .slice(0, MAX_ATTACHMENTS_PER_ACTION);
}

async function loadDirectory() {
    if (!directoryReady) {
        directoryReady = get<string>(DIRECTORY_KEY).then(async value => {
            if (typeof value === "string" && value.length > 0) {
                downloadDirectory = value;
                return;
            }

            const legacyValue = await get<string>(LEGACY_DIRECTORY_KEY);
            if (typeof legacyValue === "string" && legacyValue.length > 0) {
                downloadDirectory = legacyValue;
                await set(DIRECTORY_KEY, legacyValue);
            }
        });
    }

    await directoryReady;
}

function getDownloadFolderMode(): DownloadFolderMode {
    const mode = settings.store.downloadFolderMode;
    return mode === "downloads" || mode === "ask" ? mode : "specified";
}

function getNativeInterceptionOptions() {
    const mode = getDownloadFolderMode();
    return {
        directory: mode === "specified" ? downloadDirectory : undefined,
        askEveryTime: mode === "ask",
    };
}

async function resolveDownloadDirectory(): Promise<string | undefined | null> {
    await loadDirectory();

    switch (getDownloadFolderMode()) {
        case "ask":
            return Native.chooseDownloadDirectory();
        case "specified":
            return downloadDirectory;
        default:
            return undefined;
    }
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }
    return "Unknown native error";
}

function describeAttachmentUrl(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        return `${url.origin}${url.pathname}`;
    } catch {
        return "invalid URL";
    }
}

function isAttachmentUrl(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        return url.protocol === "https:" &&
            (url.hostname === "cdn.discordapp.com" || url.hostname === "media.discordapp.net") &&
            (url.pathname.includes("/attachments/") || url.pathname.includes("/ephemeral-attachments/"));
    } catch {
        return false;
    }
}

function filenameFromUrl(rawUrl: string) {
    try {
        const name = decodeURIComponent(new URL(rawUrl).pathname.split("/").pop() || "download");
        return name || "download";
    } catch {
        return "download";
    }
}

function getElementLabel(element: Element) {
    return [
        element.getAttribute("aria-label"),
        element.getAttribute("data-tooltip-content"),
        element.getAttribute("title"),
        element.textContent,
    ].filter(Boolean).join(" ").toLowerCase();
}

function isDownloadControl(element: Element) {
    return element.hasAttribute("download") || /\bdownload\b/.test(getElementLabel(element));
}

function findAttachmentUrl(element: Element) {
    let current: Element | null = element;
    while (current) {
        for (const attribute of ["href", "data-url", "data-src", "src"]) {
            const value = current.getAttribute(attribute);
            if (value && isAttachmentUrl(value)) return value;
        }
        current = current.parentElement;
    }
    return null;
}

function installDownloadButtonInterception() {
    if (documentClickHandler) return;

    documentClickHandler = event => {
        if (event.button !== 0 || !(event.target instanceof Element)) return;

        const control = event.target.closest<HTMLElement>("button, a, [role=button], [aria-label], [data-tooltip-content], [title]");
        if (!control || !isDownloadControl(control)) return;

        const url = findAttachmentUrl(control);
        if (!url) return;

        event.preventDefault();
        event.stopPropagation();
        void startAttachmentDownload({ url, filename: filenameFromUrl(url) });
    };
    document.addEventListener("click", documentClickHandler, true);

    const fallbackOpen = window.open.bind(window);
    originalWindowOpen = fallbackOpen;
    const wrappedOpen = (url?: string | URL, target?: string, features?: string) => {
        const rawUrl = url?.toString();
        if (rawUrl && isAttachmentUrl(rawUrl)) {
            void startAttachmentDownload({ url: rawUrl, filename: filenameFromUrl(rawUrl) });
            return null;
        }
        return fallbackOpen(url, target, features);
    };
    window.open = wrappedOpen as typeof window.open;
    interceptedWindowOpen = window.open;
}

function uninstallDownloadButtonInterception() {
    if (documentClickHandler) {
        document.removeEventListener("click", documentClickHandler, true);
        documentClickHandler = undefined;
    }

    if (originalWindowOpen && window.open === interceptedWindowOpen) window.open = originalWindowOpen;
    originalWindowOpen = undefined;
    interceptedWindowOpen = undefined;
}

async function updateNativeDownloadInterception(enabled = settings.store.interceptDownloadButtons) {
    try {
        if (enabled) await Native.enableDownloadInterception(getNativeInterceptionOptions());
        else await Native.disableDownloadInterception();
    } catch (error) {
        logger.warn("Native download interception is unavailable", getErrorMessage(error));
    }
}

async function pickDownloadDirectory() {
    const selected = await Native.chooseDownloadDirectory();
    if (!selected) return null;

    downloadDirectory = selected;
    await set(DIRECTORY_KEY, selected);
    if (pluginRunning) await updateNativeDownloadInterception();
    return selected;
}

async function chooseDownloadDirectory() {
    try {
        const selected = await pickDownloadDirectory();
        if (!selected) return;

        showToast(`Download folder set to ${selected}`, Toasts.Type.SUCCESS);
    } catch {
        showToast("Could not choose a download folder", Toasts.Type.FAILURE);
    }
}

function DownloadFolderSetting() {
    const [directory, setDirectory] = useState<string | undefined>(downloadDirectory);
    const [isChoosing, setIsChoosing] = useState(false);

    useEffect(() => {
        void loadDirectory().then(() => setDirectory(downloadDirectory));
    }, []);

    async function handleChoose() {
        setIsChoosing(true);
        try {
            const selected = await pickDownloadDirectory();
            if (selected) setDirectory(selected);
        } catch (error) {
            logger.error("Could not choose a download folder", getErrorMessage(error));
            showToast("Could not choose a download folder", Toasts.Type.FAILURE);
        } finally {
            setIsChoosing(false);
        }
    }

    return (
        <SettingsSection
            name="Specified folder"
            id="specifiedDownloadFolder"
            description="Used when the mode above is set to Specified folder. Defaults to Downloads."
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <Text variant="text-sm/normal">
                    {directory ?? "No folder set; using Downloads."}
                </Text>
                <Button onClick={handleChoose} disabled={isChoosing}>
                    {isChoosing ? "Choosing folder..." : directory ? "Change folder" : "Choose folder"}
                </Button>
            </div>
        </SettingsSection>
    );
}

async function monitorDownload(id: string, filename: string) {
    if (activePolls.has(id)) return;
    activePolls.add(id);

    try {
        while (activePolls.has(id)) {
            const status = await Native.getDownloadStatus(id);
            if (!status) return;

            if (status.state === "completed") {
                showToast(`Downloaded ${filename}`, Toasts.Type.SUCCESS);
                return;
            }

            if (status.state === "failed") {
                showToast(`Download failed: ${status.error ?? filename}`, Toasts.Type.FAILURE);
                return;
            }

            if (status.state === "cancelled") {
                showToast(`Cancelled ${filename}`, Toasts.Type.MESSAGE);
                return;
            }

            await wait(400);
        }
    } catch {
        showToast(`Could not monitor ${filename}`, Toasts.Type.FAILURE);
    } finally {
        activePolls.delete(id);
    }
}

async function startAttachmentDownload(
    attachment: DownloadableAttachment,
    showStartToast = true,
    directoryPromise?: Promise<string | undefined | null>,
) {
    if (!attachment?.url || !attachment.filename) return false;

    try {
        const targetDirectory = await (directoryPromise ?? resolveDownloadDirectory());
        if (targetDirectory === null) return false;

        const started = await Native.startDownload({
            url: attachment.url,
            filename: attachment.filename,
            directory: targetDirectory,
        });

        if (showStartToast) {
            showToast(`Downloading ${started.filename}`, Toasts.Type.MESSAGE);
        }

        void monitorDownload(started.id, started.filename);
        return true;
    } catch (error) {
        const reason = getErrorMessage(error);
        logger.error("Could not start attachment download", {
            filename: attachment.filename,
            location: describeAttachmentUrl(attachment.url),
            reason,
        });
        if (showStartToast) {
            showToast(`Could not start ${attachment.filename}: ${reason}`, Toasts.Type.FAILURE);
        }
        return false;
    }
}

async function downloadAttachments(attachments: readonly DownloadableAttachment[]) {
    const validAttachments = attachments
        .filter(attachment => attachment?.url && attachment.filename)
        .slice(0, MAX_ATTACHMENTS_PER_ACTION);

    if (!validAttachments.length) {
        showToast("No downloadable attachments found", Toasts.Type.FAILURE);
        return;
    }

    const directoryPromise = resolveDownloadDirectory();
    try {
        if (await directoryPromise === null) return;
    } catch (error) {
        logger.error("Could not choose a download folder", getErrorMessage(error));
        showToast("Could not choose a download folder", Toasts.Type.FAILURE);
        return;
    }

    const started = await Promise.all(validAttachments.map(attachment =>
        startAttachmentDownload(attachment, false, directoryPromise)
    ));
    const count = started.filter(Boolean).length;

    if (count > 0) {
        showToast(`Started ${count} download${count === 1 ? "" : "s"}`, Toasts.Type.MESSAGE);
    } else {
        showToast("Could not start the downloads", Toasts.Type.FAILURE);
    }
}

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const { message } = props as { message?: Message };
    if (!message || !hasDownloadableAttachments(message)) return;

    const attachments = getAttachmentFromMessage(message);
    children.push(
        <Menu.MenuItem
            id="inapp-downloader"
            key="inapp-downloader"
            label={attachments.length === 1 ? "Download attachment" : `Download attachments (${attachments.length})`}
            icon={CloudDownloadIcon}
            action={() => downloadAttachments(attachments)}
        />
    );
};

export default definePlugin({
    name: "InappDownloader",
    description: "No more opening my browser for stealing memes",
    tags: ["Media", "Utility"],
    authors: [Devs.skyade],
    requiresRestart: true,
    settings,

    contextMenus: {
        message: patchMessageContextMenu,
    },

    messagePopoverButton: {
        icon: CloudDownloadIcon,
        render(message: Message) {
            if (!hasDownloadableAttachments(message)) return null;

            const attachments = getAttachmentFromMessage(message);
            return {
                label: attachments.length === 1 ? "Download attachment" : "Download attachments",
                icon: CloudDownloadIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => downloadAttachments(attachments),
            };
        },
    },

    toolboxActions: {
        "Choose download folder": () => { void chooseDownloadDirectory(); },
    },

    async start() {
        await loadDirectory();
        pluginRunning = true;
        if (settings.store.interceptDownloadButtons) installDownloadButtonInterception();
        await updateNativeDownloadInterception(settings.store.interceptDownloadButtons);
    },

    stop() {
        pluginRunning = false;
        uninstallDownloadButtonInterception();
        void Native.disableDownloadInterception();
        activePolls.clear();
    },
});
