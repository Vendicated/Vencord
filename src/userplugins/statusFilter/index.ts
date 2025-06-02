/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";


const enum FilterMode {
    Whitelist,
    Blacklist
}

export const settings = definePluginSettings({
    listMode: {
        type: OptionType.SELECT,
        description: "Change the mode of the filter list",
        options: [

            {
                label: "Blacklist",
                value: FilterMode.Blacklist,
            },
            {
                label: "Whitelist",
                value: FilterMode.Whitelist,
                default: true
            }
        ],
    },

    statusFilter: {
        type: OptionType.STRING,
        description: "Filter status messages",
        defaultValue: "",
    },
});

export default definePlugin({
    name: "Status Filter",
    description: "Filter status messages on list",
    authors: [{ name: "kyrillk", id: 0n }],
    settings,
    statusFilter(activity) { // String args, String[] compare
        return activity.state = "DEBUG_TEXT: ";
        /* if (!activity?.state) return activity;

        const filterText = this.settings.store.statusFilter;
        if (!filterText) return activity;

        const filters = filterText.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
        const statusText = activity.state.toLowerCase();

        // Depending on whitelist/blacklist mode
        if (this.settings.store.listMode === FilterMode.Whitelist) {
            // In whitelist mode, replace matching status text
            if (filters.some(filter => statusText.includes(filter))) {
                // Custom replacement - you can change this logic as needed
                activity.state = "Your custom text: " + activity.state;
            }
        } else {
            // In blacklist mode, replace blacklisted status text
            if (filters.some(filter => statusText.includes(filter))) {
                activity.state = "Filtered: ***";
            }
        }

        return activity;*/
    },
    start() {
        /* console.warn("Status Filter plugin test: scanning modules for likely status text renderers...");
        const propsToTest = [
            ["children", "className", "variant"],
            ["children", "className"],
            ["children", "variant"],
            ["className", "variant"],
            ["activity", "state"],
            ["getURL", "getEmojiColors"],
            ["getURL"],
            ["className"],
            ["variant"]
        ];

        for (const props of propsToTest) {
            try {
                const mod = findByPropsLazy(...props);
                if (mod) {
                    console.warn(`Found module with props: ${props.join(", ")}`, mod);
                }
            } catch (e) {
                // Ignore errors for missing modules
            }
        }*/

        const propsToTest = ["children", "className", "variant"];


        const TooltipModule = findByPropsLazy(...propsToTest);
        if (TooltipModule == null) {
            console.warn("Tooltip component not found");
            return;
        }
        console.warn("TooltipModule ", TooltipModule.children);

        TooltipModule.children = "test";

        /* const OriginalTooltip = TooltipModule.U; // Save original component

        TooltipModule.U = props => {
            return OriginalTooltip({
                ...props,
                children: "Custom Tooltip Content", // Your new children value
            });
        };*/
    },
});




