/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";

import { openAccessModal } from "./components/accessModal";
import { contextMenus } from "./components/contextMenus";
import { accessChannel, initData, isLocked, isPasswordProtected, saveData } from "./data";

interface NSFWBlockProps {
    title: string;
    description: string;
    agreement: string;
    disagreement: string;
    onAgree: () => void;
    onDisagree: () => void;
}

export default definePlugin({
    name: "PasswordProtect",
    description: "Passcode protect servers, channels, and dms. WARNING: Disabling the plugin will allow anyone to open the channels!",
    authors: [Devs.ImLvna],

    contextMenus: contextMenus,

    patches: [
        {
            find: "GuildNSFWAgreeStore",
            replacement: {
                match: /didAgree\((\i)\){/,
                replace: "$&if($self.isLocked($1)) return false; if($self.isPasswordProtected($1)) return true;"
            }
        },
        {
            find: "return this.nsfw",
            replacement: {
                match: /return this.nsfw/,
                replace: "if($self.isLocked(this.id)) return true;$&"
            }
        },
        {
            find: ".gatedContent,",
            replacement: {
                match: /this.props/,
                replace: "$self.patchProps($&)"
            }
        }
    ],

    patchProps(props: NSFWBlockProps) {
        const channel = getCurrentChannel();
        if (!isPasswordProtected(channel.id)) return props;
        props.title = "This channel is password protected";
        props.description = "This channel is password protected. Please enter the password to view the content.";
        props.agreement = "Enter password";
        props.disagreement = "Cancel";
        props.onAgree = () => {
            openAccessModal(channel.id, async success => {
                console.log(success);
                if (success) {
                    accessChannel(channel);
                }
            }
            );
        };
        return props;
    },

    isLocked,

    isPasswordProtected,

    start() {
        initData();
    },
    stop() {
        saveData();
    },
});
