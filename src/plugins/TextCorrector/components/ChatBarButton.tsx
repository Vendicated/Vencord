/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { Tooltip, useState } from "@webpack/common";

import { settings } from "../settings";
import { TextCorrectorIcon } from "./TextCorrectorIcon";

export const TextCorrectorChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    const [isEnabled, setIsEnabled] = useState(settings.store.autoCorrect);

    if (!isMainChat) return null;

    const toggle = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        settings.store.autoCorrect = newState;
    };

    return (
        <Tooltip text={`Text Correction is ${isEnabled ? "Enabled" : "Disabled"}`}>
            {() => (
                <ChatBarButton
                    tooltip="Toggle Text Correction"
                    onClick={toggle}
                    className={`text-corrector-button ${isEnabled ? "enabled" : "disabled"}`}
                >
                    <TextCorrectorIcon color={isEnabled ? "var(--green-360)" : "var(--red-360)"} />
                </ChatBarButton>
            )}
        </Tooltip>
    );
};
