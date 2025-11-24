/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { disableStyle, enableStyle } from "@api/Styles";
import { PaintbrushIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { closeModal, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { extractAndLoadChunksLazy, findStoreLazy } from "@webpack";
import { ChannelStore, DraftType, FluxDispatcher, Menu, SelectedChannelStore, UploadHandler } from "@webpack/common";

import RemixModal from "./RemixModal";
import css from "./styles.css?managed";

const requireCreateStickerModal = extractAndLoadChunksLazy(["stickerInspected]:"]);
const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}(\i\.\i\("?.+?"?\).*?).then\(\i\.bind\(\i,"?(.+?)"?\)\).{0,50}"UserSettings"/);

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
        icon={PaintbrushIcon}
        action={() => {
            const key = openModal(modalProps =>
                <RemixModal modalProps={modalProps} close={() => closeModal(key)} url={url} />
            );
        }}
    />);
};

export function sendRemix(blob: Blob) {
    const currentChannelId = SelectedChannelStore.getChannelId();
    const channel = ChannelStore.getChannel(currentChannelId);
    const reply = PendingReplyStore.getPendingReply(currentChannelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", currentChannelId });

    const file = new File([blob], "remix.png", { type: "image/png" });
    UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage);
}

export default definePlugin({
    name: "RemixRevived",
    description: "Revives Remix and breings it to Desktop",
    authors: [EquicordDevs.MrDiamond, EquicordDevs.meowabyte],
    contextMenus: {
        "channel-attach": UploadContextMenuPatch,
        "message": MessageContextMenuPatch,
    },

    async start() {

        await requireCreateStickerModal();
        await requireSettingsMenu();

        enableStyle(css);
    },

    stop() {
        disableStyle(css);
    },
});
