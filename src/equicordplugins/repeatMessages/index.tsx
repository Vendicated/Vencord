/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { sendMessage } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, useEffect } from "@webpack/common";

interface AttachmentInfo {
    filename: string;
    url: string;
}

const cl = classNameFactory("vc-repeat-");

function RepeatMessageIcon({ className }: { className?: string; }) {
    return (
        <svg
            viewBox="0 -960 960 960"
            height={24}
            width={24}
            className={cl("icon", className)}
        >
            <path fill="currentColor" d="m274-200 34 34q12 12 11.5 28T308-110q-12 12-28.5 12.5T251-109L148-212q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l103-103q12-12 28.5-11.5T308-370q11 12 11.5 28T308-314l-34 34h406v-120q0-17 11.5-28.5T720-440q17 0 28.5 11.5T760-400v120q0 33-23.5 56.5T680-200H274Zm412-480H280v120q0 17-11.5 28.5T240-520q-17 0-28.5-11.5T200-560v-120q0-33 23.5-56.5T280-760h406l-34-34q-12-12-11.5-28t11.5-28q12-12 28.5-12.5T709-851l103 103q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L709-589q-12 12-28.5 11.5T652-590q-11-12-11.5-28t11.5-28l34-34Z" />
        </svg>
    );
}

let shift = false;

function repeatMessage(msg: Message) {
    if (!msg) return;
    let content = "";
    content += msg.content;

    const allAttachments: AttachmentInfo[] = [];

    if (msg.attachments?.length) {
        allAttachments.push(
            ...msg.attachments.map(a => ({
                filename: a.filename,
                url: a.url,
            }))
        );
    }

    if (msg.messageSnapshots) {
        msg.messageSnapshots.forEach(snapshot => {
            if (snapshot.message.attachments?.length) {
                allAttachments.push(
                    ...snapshot.message.attachments.map(a => ({
                        filename: a.filename,
                        url: a.url,
                    }))
                );
            }
        });
    }

    if (allAttachments.length) {
        content += "\nAttachments:";
        allAttachments.forEach(a => {
            content += `\n - ${a.filename} (${a.url})`;
        });
    }

    sendMessage(msg.channel_id,
        { content },
        true,
        {
            allowedMentions: {
                parse: [],
                replied_user: false
            },
            messageReference: shift ? {
                channel_id: msg.channel_id,
                message_id: msg.id
            } : undefined,
            stickerIds: msg.stickerItems.map(s => s.id)
        });
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { msg }: { msg: Message; }) => {
    if (!msg) return null;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    const forceUpdate = useForceUpdater();

    useEffect(() => {
        const handler = () => {
            forceUpdate();
        };

        window.addEventListener("keydown", handler);
        window.addEventListener("keyup", handler);

        return () => {
            window.removeEventListener("keydown", handler);
            window.removeEventListener("keyup", handler);
        };
    }, []);

    group.splice(group.findIndex(c => c?.props?.id === "reply") + 1, 0, (
        <Menu.MenuItem
            id="vc-repeat"
            label={shift ? "Repeat and Reply" : "Repeat"}
            icon={RepeatMessageIcon}
            action={async () => repeatMessage(msg)}
        />
    ));
};

const keyupListener = (event: KeyboardEvent) => {
    if (event.key === "Shift") shift = false;
};

const keydownListener = (event: KeyboardEvent) => {
    if (event.key === "Shift") shift = true;
};

migratePluginSettings("RepeatMessages", "RepeatMessage");
export default definePlugin({
    name: "RepeatMessages",
    description: "Allows you to repeat messages quickly. If you hold shift while clicking the Repeat option, it will reply to the message.",
    authors: [EquicordDevs.Tolgchu, Devs.thororen],
    contextMenus: {
        "message": messageCtxPatch
    },
    messagePopoverButton: {
        icon: RepeatMessageIcon,
        render(msg) {
            if (!msg) return null;
            return {
                label: "Repeat (Click) / Repeat and Reply (Shift + Click)",
                icon: RepeatMessageIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: async () => repeatMessage(msg)
            };
        }
    },
    start() {
        document.addEventListener("keyup", keyupListener);
        document.addEventListener("keydown", keydownListener);
    },
    stop() {
        document.removeEventListener("keyup", keyupListener);
        document.removeEventListener("keydown", keydownListener);
    },
});
