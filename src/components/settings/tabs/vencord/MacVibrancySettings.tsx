/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { IS_MAC } from "@utils/constants";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Forms, Select } from "@webpack/common";

export function MacOSVibrancySettings() {
    const settings = useSettings(["macosVibrancyStyle"]);
    if (!IS_MAC) return null;

    return (
        <ErrorBoundary noop>
            <Forms.FormTitle tag="h5">MacOS Window vibrancy style (requires restart)</Forms.FormTitle>
            <Select
                className={Margins.bottom20}
                placeholder="Window vibrancy style"
                options={[
                    // Sorted from most opaque to most transparent
                    {
                        label: "No vibrancy", value: undefined
                    },
                    {
                        label: "Under Page (window tinting)",
                        value: "under-page"
                    },
                    {
                        label: "Content",
                        value: "content"
                    },
                    {
                        label: "Window",
                        value: "window"
                    },
                    {
                        label: "Selection",
                        value: "selection"
                    },
                    {
                        label: "Titlebar",
                        value: "titlebar"
                    },
                    {
                        label: "Header",
                        value: "header"
                    },
                    {
                        label: "Sidebar",
                        value: "sidebar"
                    },
                    {
                        label: "Tooltip",
                        value: "tooltip"
                    },
                    {
                        label: "Menu",
                        value: "menu"
                    },
                    {
                        label: "Popover",
                        value: "popover"
                    },
                    {
                        label: "Fullscreen UI (transparent but slightly muted)",
                        value: "fullscreen-ui"
                    },
                    {
                        label: "HUD (Most transparent)",
                        value: "hud"
                    },
                ]}
                select={v => settings.macosVibrancyStyle = v}
                isSelected={v => settings.macosVibrancyStyle === v}
                serialize={identity}
            />
        </ErrorBoundary>
    );
}
