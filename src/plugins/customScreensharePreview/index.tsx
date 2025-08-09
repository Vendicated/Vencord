/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { PencilIcon } from "@components/Icons";
import { openPluginModal } from "@components/settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Alerts, Button, Menu, Toasts } from "@webpack/common";

import customScreensharePreview from "../customScreensharePreview";
import { checkFileMime, getFileNative, getFileWeb, hexToBase64 } from "./utils";


const MAX_SIZE = 204800;

const streamRTCConnectionStore = findStoreLazy("StreamRTCConnectionStore") as {
    getRTCConnection: (key: string) => {
        reconnect: () => void;
    };
} | null;

const applicationStreamingStore = findStoreLazy("ApplicationStreamingStore") as {
    getCurrentUserActiveStream: () => {
        channelId: string,
        guildId: string,
        ownerId: string,
        state: string,
        streamType: string,
    } | null;
} | null;

const settings = definePluginSettings({
    customImage: {
        type: OptionType.STRING,
        description: "Custom image URL",
        hidden: true,
        onChange: onImageChange
    },
    streamSettingsOption: {
        type: OptionType.BOOLEAN,
        description: "Add an option to the stream settings menu to open this modal.",
        default: true,
        restartNeeded: true
    },
    component: {
        type: OptionType.COMPONENT,
        component: () =>
            <>
                <div className="vc-csp-buttonContainer">
                    <Button onClick={pickImage}>
                        Pick Image
                    </Button>

                    <Button color={Button.Colors.RED}
                        disabled={!settings.store.customImage}
                        onClick={removeImage}>
                        Remove Image
                    </Button>
                </div>

                {settings.store.customImage &&
                    <div className="vc-csp-previewCotainer">
                        <div className="vc-csp-previewImage">
                            <img className="vc-csp-image"
                                src={settings.store.customImage} />
                        </div>
                    </div>}
            </>
    }
});

export default definePlugin({
    name: "CustomScreensharePreview",
    description: "Set any image as the screenshare preview.",
    authors: [Devs.FawazT],
    settings,
    patches: [
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /(?<=let \i=)\i.toDataURL\("image/,
                replace: "$self.settings.store.customImage ?? $&"
            }
        },
        {
            find: "ApplicationStreamPreviewUploadManager",
            replacement: {
                match: /new \i\.\i\("ApplicationStreamPreviewUploadManager"\)\.error\("Failed to post stream preview",(\i)\),/,
                replace: "$& $self.notifyPostFail($1),"
            }
        },
        {
            find: "stop-streaming",
            predicate: () => settings.store.streamSettingsOption,
            replacement: {
                match: /(?<=return )\i\?\(0,.+children:.+}\):\(0,.+children:.+}\)/,
                replace: "($&).props.children.concat($self.openModalItem())"
            }
        }
    ],

    notifyPostFail(e: any) {
        if ((e?.message ?? e?.body?.message)?.includes("rate limit")) {
            return;
        }

        showNotification({
            title: "Custom Screenshare Preview",
            body: "Failed to post custom screenshare preview, check the console for more information.",
            color: "var(--status-danger, red)"
        });
    },
    openModalItem() {
        return (
            <Menu.MenuItem id="vc-csp-omi"
                icon={PencilIcon}
                label="Change Preview"
                action={() => openPluginModal(customScreensharePreview, onRestartNeeded)} />
        );
    }
});

async function pickImage() {
    let hex: string | null;
    try {
        hex = await (IS_WEB ? getFileWeb("image/jpeg,image/png,image/webp") : getFileNative("Select Image", [{
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp"]
        }]));
    } catch (e) {
        new Logger("CustomScreensharePreview").error("An error occurred while picking the image:", e);
        Toasts.show({
            id: Toasts.genId(),
            message: "An error occurred while picking the image, check the console for more information.",
            type: Toasts.Type.FAILURE
        });
        return;
    }
    if (!hex) {
        Toasts.show({
            id: Toasts.genId(),
            message: "User cancelled selection.",
            type: Toasts.Type.FAILURE
        });
        return;
    }

    const size = hex.length / 2;
    if (size > MAX_SIZE) {
        Toasts.show({
            id: Toasts.genId(),
            message: "The selected file is too large, the maximum size is 200KB.",
            type: Toasts.Type.FAILURE
        });
        return;
    }

    const mime = checkFileMime(hex);
    if (mime === "unknown") {
        Toasts.show({
            id: Toasts.genId(),
            message: "The selected file is not a valid png, jpeg, jpg, or webp image.",
            type: Toasts.Type.FAILURE
        });
        return;
    }

    const base64 = hexToBase64(hex);
    settings.store.customImage = `data:${mime};base64,${base64}`;
}

function removeImage() {
    settings.store.customImage = undefined;
}

function onImageChange() {
    try {
        const stream = applicationStreamingStore?.getCurrentUserActiveStream();
        if (!stream) {
            return;
        } else if (IS_DISCORD_DESKTOP) {
            const key = `${stream.streamType}:${stream.guildId}:${stream.channelId}:${stream.ownerId}`;
            const connection = streamRTCConnectionStore?.getRTCConnection(key);
            if (connection) {
                connection.reconnect();
                return;
            }
        }

        Toasts.show({
            id: Toasts.genId(),
            message: "Restart the screenshare to refresh the preview.",
            type: Toasts.Type.SUCCESS
        });
    } catch (e) {
        new Logger("CustomScreensharePreview").error("An error occurred while trying to refresh the screenshare preview:", e);
    }
}

function onRestartNeeded() {
    Alerts.show({
        title: "Restart required",
        body: <p>You have changed settings that require a restart.</p>,
        confirmText: "Restart now",
        cancelText: "Later!",
        onConfirm: () => location.reload()
    });
}
