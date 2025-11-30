/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { plugins } from "@api/PluginManager";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { Tooltip, useEffect, useState } from "@webpack/common";

import { pluginName, settings } from "./index"; // Import settings from the main plugin file
import { MedievalIcon } from "./MedievalIcon";
import { cl } from "./utils";

export let setShouldShowTranslateEnabledTooltip: undefined | ((show: boolean) => void);

export const MedievalChatBarButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const { translationMode, showChatBarIcon, enabled, resetDefaults } = settings.use(["translationMode", "showChatBarIcon", "enabled", "resetDefaults"]);

    const [shouldShowTooltip, setShouldShowTooltip] = useState(false);
    useEffect(() => {
        setShouldShowTranslateEnabledTooltip = setShouldShowTooltip;
        return () => setShouldShowTranslateEnabledTooltip = undefined;
    }, []);

    if (!isMainChat || !showChatBarIcon || !enabled) return null;

    // Determine icon color based on translationState
    let iconColor = "currentColor"; // Default color
    let tooltipText = "Medieval Translator Disabled";

    if (translationMode === "forward") {
        iconColor = "var(--green-360)"; // Example green for enabled
        tooltipText = "Medieval Translator Enabled (Forward)";
    } else if (translationMode === "reverse") {
        iconColor = "var(--brand-360)"; // Example brand color for reverse
        tooltipText = "Medieval Translator Enabled (Reverse)";
    }

    const toggleTranslationMode = () => {
        let newMode: "disabled" | "forward" | "reverse";
        if (translationMode === "disabled") {
            newMode = "forward";
        } else if (translationMode === "forward") {
            newMode = "reverse";
        } else {
            newMode = "disabled";
        }
        settings.store.translationMode = newMode;
    };

    const openPluginSettings = () => {
        const plugin = plugins[pluginName];
        if (plugin) openPluginModal(plugin);
    };

    const button = (
        <ChatBarButton
            tooltip={tooltipText}
            onClick={openPluginSettings}
            onContextMenu={toggleTranslationMode}
            buttonProps={{
                "aria-haspopup": "dialog" // Indicate it opens a dialog (settings modal)
            }}
        >
            <MedievalIcon className={cl("chat-button")} color={iconColor} />
        </ChatBarButton>
    );

    if (shouldShowTooltip && (translationMode === "forward" || translationMode === "reverse"))
        return (
            <Tooltip text={tooltipText} forceOpen>
                {() => button}
            </Tooltip>
        );

    return button;
};
