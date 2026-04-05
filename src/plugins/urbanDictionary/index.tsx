/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Menu, showToast, Toasts } from "@webpack/common";

import { handleUrbanLookup,UrbanAccessory } from "./UrbanAccessory";
import { fetchDefinitions } from "./utils";

const settings = definePluginSettings({
    maxDefinitions: {
        description: "Maximum number of definitions to show",
        type: OptionType.NUMBER,
        default: 3,
    },
});

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const selection = document.getSelection()?.toString();
    if (!selection) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-urban-lookup"
            label="Urban Dictionary"
            action={async () => {
                try {
                    const defs = await fetchDefinitions(selection);
                    if (defs.length === 0) {
                        showToast("No definitions found", Toasts.Type.FAILURE);
                        return;
                    }
                    handleUrbanLookup(message.id, defs);
                } catch (e) {
                    showToast("Failed to fetch Urban Dictionary definitions", Toasts.Type.FAILURE);
                    console.error(e);
                }
            }}
        />
    ));
};

export default definePlugin({
    name: "UrbanDictionary",
    description: "Allows you to look up definitions on Urban Dictionary from selected text in a message.",
    authors: [Devs.Plugman],
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },

    renderMessageAccessory: ({ message }) => (
        <UrbanAccessory
            message={message}
            maxDefinitions={settings.store.maxDefinitions}
        />
    )
});
