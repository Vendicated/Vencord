/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see .
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let onDragStart: (e: DragEvent) => void;

const settings = definePluginSettings({
    modifierKey: {
        type: OptionType.SELECT,
        description: "Key required to hold while reordering channels",
        options: [
            { label: "Shift", value: "shiftKey", default: true },
            { label: "Control (Ctrl)", value: "ctrlKey" }
        ]
    }
});

export default definePlugin({
    name: "ShiftToReorderChannels",
    description: "Requires holding a modifier key (Shift by default) to drag and reorder channels.",
    authors: [Devs.JuJuplayz],
    tags: ["Organisation", "Shortcuts", "Utility"],
    settings,

    start() {
        onDragStart = (e: DragEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[class*="containerDefault"]')) {
                const requiredKey = settings.store.modifierKey as "shiftKey" | "ctrlKey";
                if (!e[requiredKey]) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        document.addEventListener("dragstart", onDragStart, true);
    },

    stop() {
        document.removeEventListener("dragstart", onDragStart, true);
    }
});
