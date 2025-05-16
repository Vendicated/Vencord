/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ErrorCard } from "@components/ErrorCard";
import { Margins } from "@utils/margins";
import { findByCodeLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, Forms, ThemeStore, useStateFromStores } from "@webpack/common";

import { settings } from "..";
import { relativeLuminance } from "../utils/colorUtils";
import { createOrUpdateThemeColorVars } from "../utils/styleUtils";

const ColorPicker = findComponentByCodeLazy("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", ".BACKGROUND_PRIMARY)");
const saveClientTheme = findByCodeLazy('type:"UNSYNCED_USER_SETTINGS_UPDATE', '"system"===');
const NitroThemeStore = findStoreLazy("ClientThemesBackgroundStore");

const cl = classNameFactory("vc-clientTheme-");

const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938", "#b6908f", "#bfa088", "#d3c77d",
    "#86ac86", "#88aab3", "#8693b5", "#8a89ba", "#ad94bb",
];

function onPickColor(color: number) {
    const hexColor = color.toString(16).padStart(6, "0");

    settings.store.color = hexColor;
    createOrUpdateThemeColorVars(hexColor);
}

function setDiscordTheme(theme: string) {
    saveClientTheme({ theme });
}

export function ThemeSettingsComponent() {
    const currentTheme = useStateFromStores([ThemeStore], () => ThemeStore.theme);
    const isLightTheme = currentTheme === "light";
    const oppositeTheme = isLightTheme ? "Dark" : "Light";

    const nitroThemeEnabled = useStateFromStores([NitroThemeStore], () => NitroThemeStore.gradientPreset != null);

    const selectedLuminance = relativeLuminance(settings.store.color);

    let contrastWarning = false;
    let fixableContrast = true;

    if ((isLightTheme && selectedLuminance < 0.26) || !isLightTheme && selectedLuminance > 0.12) {
        contrastWarning = true;
    }

    if (selectedLuminance < 0.26 && selectedLuminance > 0.12) {
        fixableContrast = false;
    }

    // Light mode with values greater than 65 leads to background colors getting crushed together and poor text contrast for muted channels
    if (isLightTheme && selectedLuminance > 0.65) {
        contrastWarning = true;
        fixableContrast = false;
    }

    return (
        <div className={cl("settings")}>
            <div className={cl("container")}>
                <div className={cl("settings-labels")}>
                    <Forms.FormTitle tag="h3">Theme Color</Forms.FormTitle>
                    <Forms.FormText>Add a color to your Discord client theme</Forms.FormText>
                </div>
                <ColorPicker
                    color={parseInt(settings.store.color, 16)}
                    onChange={onPickColor}
                    showEyeDropper={false}
                    suggestedColors={colorPresets}
                />
            </div>
            {(contrastWarning || nitroThemeEnabled) && (<>
                <ErrorCard className={Margins.top8}>
                    <Forms.FormTitle tag="h2">Your theme won't look good!</Forms.FormTitle>

                    {contrastWarning && <Forms.FormText>{">"} Selected color won't contrast well with text</Forms.FormText>}
                    {nitroThemeEnabled && <Forms.FormText>{">"} Nitro themes aren't supported</Forms.FormText>}

                    <div className={cl("buttons-container")}>
                        {(contrastWarning && fixableContrast) && <Button onClick={() => setDiscordTheme(oppositeTheme)} color={Button.Colors.RED}>Switch to {oppositeTheme} mode</Button>}
                        {(nitroThemeEnabled) && <Button onClick={() => setDiscordTheme(currentTheme)} color={Button.Colors.RED}>Disable Nitro Theme</Button>}
                    </div>
                </ErrorCard>
            </>)}
        </div>
    );
}

export function ResetThemeColorComponent() {
    return (
        <Button onClick={() => onPickColor(0x313338)}>
            Reset Theme Color
        </Button>
    );
}
