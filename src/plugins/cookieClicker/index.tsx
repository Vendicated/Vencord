/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { React, useState } from "@webpack/common";

const CookieClickerModalContent = ({ rootProps }: { rootProps: ModalProps; }) => {
    const [cookies, setCookies] = useState(0);
    const [upgrades, setUpgrades] = useState(0);

    const handleCookieClick = () => {
        setCookies(cookies + 1 + upgrades);
    };

    const handleUpgradeClick = () => {
        if (cookies >= upgrades * 10) {
            setCookies(cookies - upgrades * 10);
            setUpgrades(upgrades + 1);
        }
    };

    const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <ModalRoot {...rootProps}>
            <div className="cookie-clicker-modal" onClick={handleModalClick}>
                <ModalHeader className="cookie-clicker-header">
                    <h3>Cookie Clicker</h3>
                </ModalHeader>
                <ModalContent className="cookie-clicker-content">
                    <div>
                        <img
                            src="https://raw.githubusercontent.com/programminglaboratorys/resources/main/Vencord.cookieClicker/cookie.svg"
                            alt="Cookie"
                            className="cookie-clicker-image"
                            onClick={handleCookieClick}
                        />
                        <p className="cookie-clicker-stats">Cookies: {cookies}</p>
                        <button
                            className="cookie-clicker-button"
                            onClick={handleUpgradeClick}
                            disabled={cookies < upgrades * 10}
                        >
                            Upgrade ({upgrades * 10} cookies)
                        </button>
                    </div>
                </ModalContent>
            </div>
        </ModalRoot>
    );
};

const CookieClickerButton: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;

    const handleOpenModal = () => {
        openModal(props => <CookieClickerModalContent rootProps={props} />);
    };

    return (
        <ChatBarButton
            tooltip="Open Cookie Clicker"
            onClick={handleOpenModal}
        >
            <img src="https://raw.githubusercontent.com/programminglaboratorys/resources/main/Vencord.cookieClicker/cookie.svg" alt="Cookie Icon" style={{ width: "24px", height: "24px" }} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "CookieClicker",
    description: "A simple Cookie Clicker game",
    authors: [Devs.Leonlp9],
    start() {
        addChatBarButton("CookieClickerButton", CookieClickerButton);
    },
    stop() {
        removeChatBarButton("CookieClickerButton");
    }
});
