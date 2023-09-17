/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton } from "@api/MessagePopover";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import RemixIcon from "./Icons/RemixIcon";
import RemixModal from "./RemixModal";

const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");

const VALID_MIME_TYPES = /image\/(png|jpg|jpeg)/;

function promptUpload(file: File, channel: Channel) {
    // Immediately after the command finishes, Discord clears all input, including pending attachments.
    // Thus, setTimeout is needed to make this execute after Discord cleared the input
    setTimeout(() => promptToUpload([file], channel, 0), 10);
}

export default definePlugin({
    name: "Remix",
    description: "Adds the Remix feature to Discord for free.",
    dependencies: ["MessagePopoverAPI"],
    authors: [Devs.MrDiamond],

    start() {
        addButton("remix", msg => {
            if (msg.attachments.length === 0) return null;

            for (let i = 0; i < msg.attachments.length; i++) {
                const attachment = msg.attachments[i];
                if (!attachment.content_type?.match(VALID_MIME_TYPES)) return null;
            }

            return {
                label: "Remix",
                icon: RemixIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => this.remix(msg.attachments[0].url)
            };
        });
    },

    remix(image: string) {
        const key = openModal(props => <RemixModal key={key} modalKey={key} image={image} {...props} />);
    }
});

export function handleFinishRemixing(image: File) {
    promptUpload(image, getCurrentChannel());
}
