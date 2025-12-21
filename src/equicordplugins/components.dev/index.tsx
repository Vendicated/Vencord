/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import SettingsPlugin from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { openUserSettingsPanel } from "@webpack/common";

import ComponentsTab from "./components/ComponentsTab";

function ComponentsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M3 15.5V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v.5a.5.5 0 0 1-.5.5H17a4 4 0 0 0-4 4v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5ZM12.5 18H2a1 1 0 1 0 0 2h10.48c.33 0 .57-.3.54-.63A4.08 4.08 0 0 1 13 19v-.5a.5.5 0 0 0-.5-.5Z"
            />
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M15 11c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-8Zm2 1a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export default definePlugin({
    name: "Components",
    description: "Adds a new tab to settings to browse Discord components.",
    authors: [EquicordDevs.Prism],
    dependencies: ["Settings"],
    startAt: StartAt.WebpackReady,
    toolboxActions: {
        "Open Components Tab"() {
            openUserSettingsPanel("equicord_components");
        },
    },
    start() {
        const { customEntries, customSections } = SettingsPlugin;

        customEntries.push({
            key: "equicord_components",
            title: "Components",
            Component: ComponentsTab,
            Icon: ComponentsIcon
        });

        customSections.push(() => ({
            section: "EquicordDiscordComponents",
            label: "Components",
            element: ComponentsTab,
            className: "vc-discord-components",
            id: "Components"
        }));
    },
    stop() {
        const { customEntries, customSections } = SettingsPlugin;
        const entryIdx = customEntries.findIndex(e => e.key === "equicord_components");
        const sectionIdx = customSections.findIndex(s => s({} as any).id === "Components");
        if (entryIdx !== -1) customEntries.splice(entryIdx, 1);
        if (sectionIdx !== -1) customSections.splice(sectionIdx, 1);
    },
});
