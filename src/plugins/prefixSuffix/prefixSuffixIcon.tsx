/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { classNameFactory } from "@api/Styles";
import { openModal } from "@utils/modal";

import { settings } from "./settings";
import { PrefixSuffixModal } from "./prefixSuffixModal";

const cl = classNameFactory("vc-prefixSuffix-");

export function PrefixSuffixIcon({ className }: { className?: string; }) {
    return (
        <>
            <div className={className}>
                {settings.store.prefix}
            </div>
            <div className={className}>
                {settings.store.suffix}
            </div>
        </>
    );
}

export const PrefixSuffixChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    const { autoPrefixSuffix, showChatBarButton } = settings.use(["autoPrefixSuffix", "showChatBarButton"]);

    if (!isMainChat || !showChatBarButton) return null;

    const settingPopup = () => {
        openModal(props => (
            <PrefixSuffixModal rootProps={props} />
        ));
    };

    const button = (
        <ChatBarButton
            tooltip="AutoPrefixSuffix"
            onClick={e => {
                if (e.shiftKey) return settingPopup();
                settings.store.autoPrefixSuffix = !settings.store.autoPrefixSuffix;
            }}
            onContextMenu={settingPopup}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <PrefixSuffixIcon className={cl({ "chat-button-on": autoPrefixSuffix, "chat-button-off": !autoPrefixSuffix, "chat-button": true })} />
        </ChatBarButton>
    );

    return button;
};
