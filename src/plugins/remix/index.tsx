/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { closeModal, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { extractAndLoadChunksLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, Menu, MessageActions, RestAPI, showToast, SnowflakeUtils, Toasts } from "@webpack/common";
import { Util } from "Vencord";

import RemixModal from "./RemixModal";
import css from "./styles.css?managed";

// so FileUpload is loaded
export const requireCreateStickerModal = extractAndLoadChunksLazy(["stickerInspected]:"]);

const CloudUtils = findByPropsLazy("CloudUpload");
const PendingReplyStore = findStoreLazy("PendingReplyStore");

const UploadContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (children.find(c => c?.props?.id === "vc-remix")) return;

    children.push(<Menu.MenuItem
        id="vc-remix"
        label="Remix"
        action={() => {
            const key = openModal(props =>
                <RemixModal modalProps={props} close={() => closeModal(key)} />
            );
        }}
    />);
};

const ImageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props.attachment || children.find(c => c?.props?.id === "vc-remix")) return;

    children.push(<Menu.MenuItem
        id="vc-remix"
        label="Remix"
        action={() => {
            const key = openModal(modalProps =>
                <RemixModal modalProps={modalProps} close={() => closeModal(key)} url={props.attachment.url} />
            );
        }}
    />);
};

export function sendRemix(blob: Blob) {
    const currentChannelId = Util.getCurrentChannel().id;
    const reply = PendingReplyStore.getPendingReply(currentChannelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", currentChannelId });

    const upload = new CloudUtils.CloudUpload({
        file: new File([blob], "remix.png", { type: "image/png" }),
        isClip: false,
        isThumbnail: false,
        platform: 1
    }, currentChannelId, false, 0);

    upload.on("complete", () => {
        RestAPI.post({
            url: `/channels/${currentChannelId}/messages`,
            body: {
                channel_id: currentChannelId,
                content: "",
                nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                sticker_ids: [],
                attachments: [{
                    id: "0",
                    filename: upload.filename,
                    uploaded_filename: upload.uploadedFilename,
                    size: blob.size,
                    is_remix: settings.store.remixTag
                }],
                message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
            },
        });
    });
    upload.on("error", () => showToast("Failed to upload remix", Toasts.Type.FAILURE));

    upload.upload();
}

const settings = definePluginSettings({
    remixTag: {
        description: "Include the remix tag in remixed messages",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

export default definePlugin({
    name: "Remix",
    description: "Adds Remix to Desktop",
    authors: [Devs.MrDiamond],
    settings,

    async start() {
        addContextMenuPatch("channel-attach", UploadContextMenuPatch);
        addContextMenuPatch("message", ImageContextMenuPatch);

        await requireCreateStickerModal();

        enableStyle(css);
    },

    stop() {
        removeContextMenuPatch("channel-attach", UploadContextMenuPatch);
        removeContextMenuPatch("message", ImageContextMenuPatch);

        disableStyle(css);
    },
});
