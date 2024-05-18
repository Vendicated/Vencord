/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
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
// so ColorPicker is loaded
export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/);

const CloudUtils = findByPropsLazy("CloudUpload");
const PendingReplyStore = findStoreLazy("PendingReplyStore");


const validMediaTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

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

const MessageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const url = props.itemHref ?? props.itemSrc;
    if (!url) return;
    if (props.attachment && !validMediaTypes.includes(props.attachment.content_type)) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;
    if (group.find(c => c?.props?.id === "vc-remix")) return;

    const index = group.findIndex(c => c?.props?.id === "copy-text");

    group.splice(index + 1, 0, <Menu.MenuItem
        id="vc-remix"
        label="Remix"
        action={() => {
            const key = openModal(modalProps =>
                <RemixModal modalProps={modalProps} close={() => closeModal(key)} url={url} />
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
    authors: [{
        name: "MrDiamond",
        id: 523338295644782592n
    }],
    settings,

    async start() {
        addContextMenuPatch("channel-attach", UploadContextMenuPatch);
        addContextMenuPatch("message", MessageContextMenuPatch);

        await requireCreateStickerModal();
        await requireSettingsMenu();

        enableStyle(css);
    },

    stop() {
        removeContextMenuPatch("channel-attach", UploadContextMenuPatch);
        removeContextMenuPatch("message", MessageContextMenuPatch);

        disableStyle(css);
    },
});
