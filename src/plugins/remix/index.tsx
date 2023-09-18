/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId } from "@api/ContextMenu";
import { addButton, removeButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, Menu } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import RemixIcon from "./Icons/RemixIcon";
import RemixModal from "./RemixModal";

const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");

const VALID_MIME_TYPES = /image\/(png|jpg|jpeg)/;

function promptUpload(file: File, channel: Channel) {
    // Immediately after the command finishes, Discord clears all input, including pending attachments.
    // Thus, setTimeout is needed to make this execute after Discord cleared the input
    setTimeout(() => promptToUpload([file], channel, 0), 10);
}

function checkMessage(msg: Message): boolean {
    if (msg.attachments.length === 0) return false;

    for (let i = 0; i < msg.attachments.length; i++) {
        const attachment = msg.attachments[i];
        if (!attachment.content_type?.match(VALID_MIME_TYPES)) return false;
    }

    return true;
}

function remix(image: string) {
    const key = openModal(props => <RemixModal key={key} modalKey={key} image={image} {...props} />);
}

const contextMenuPatch = (children, { message: msg }) => () => {
    if (!checkMessage(msg)) return;

    const group = findGroupChildrenByChildId("save-image", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "save-image") + 1, 0, (
        <Menu.MenuItem
            id="vc-remix"
            label="Remix"
            icon={RemixIcon}
            action={() => remix(msg.attachments[0].url)}
        />
    ));
};

export default definePlugin({
    name: "Remix",
    description: "Adds the Remix feature to Discord for free.",
    dependencies: ["MessagePopoverAPI"],
    authors: [Devs.MrDiamond],

    start() {
        addButton("vc-remix", msg => {
            if (!checkMessage(msg)) return null;

            return {
                label: "Remix",
                icon: RemixIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => remix(msg.attachments[0].url)
            };
        });

        addContextMenuPatch("message", contextMenuPatch);
    },

    stop() {
        removeButton("vc-remix");
    }
});

export function handleFinishRemixing(image: File) {
    promptUpload(image, getCurrentChannel());
}
