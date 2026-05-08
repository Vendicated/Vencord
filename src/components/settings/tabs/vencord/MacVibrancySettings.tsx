/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Forms, Select } from "@webpack/common";

export function VibrancySettings() {
    const settings = useSettings(["macosVibrancyStyle"]);

    return (
        <>
            <Forms.FormTitle tag="h5">{t("Window vibrancy style (requires restart)")}</Forms.FormTitle>
            <ErrorBoundary noop>
                <Select
                    className={Margins.bottom20}
                    placeholder={t("Window vibrancy style")}
                    options={[
                        // Sorted from most opaque to most transparent
                        {
                            label: t("No vibrancy"), value: undefined
                        },
                        {
                            label: t("Under Page (window tinting)"),
                            value: "under-page"
                        },
                        {
                            label: t("Content"),
                            value: "content"
                        },
                        {
                            label: t("Window"),
                            value: "window"
                        },
                        {
                            label: t("Selection"),
                            value: "selection"
                        },
                        {
                            label: t("Titlebar"),
                            value: "titlebar"
                        },
                        {
                            label: t("Header"),
                            value: "header"
                        },
                        {
                            label: t("Sidebar"),
                            value: "sidebar"
                        },
                        {
                            label: t("Tooltip"),
                            value: "tooltip"
                        },
                        {
                            label: t("Menu"),
                            value: "menu"
                        },
                        {
                            label: t("Popover"),
                            value: "popover"
                        },
                        {
                            label: t("Fullscreen UI (transparent but slightly muted)"),
                            value: "fullscreen-ui"
                        },
                        {
                            label: t("HUD (Most transparent)"),
                            value: "hud"
                        },
                    ]}
                    select={v => settings.macosVibrancyStyle = v}
                    isSelected={v => settings.macosVibrancyStyle === v}
                    serialize={identity}
                />
            </ErrorBoundary>
        </>
    );
}
