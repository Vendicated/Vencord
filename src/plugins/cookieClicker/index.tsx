/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

const cookieClickerStoreKey = "Vencord.cookieClicker";

const CookieClickerModalContent = ({ rootProps }: { rootProps: ModalProps; }) => {
    const [cookies, setCookies] = useState(0);
    const [upgrades, setUpgrades] = useState(0);
    const [floatingNumbers, setFloatingNumbers] = useState<
        { id: number; value: number; x: number; y: number; }[]
    >([]);

    useEffect(() => {
        // Load saved game state
        const loadGameState = async () => {
            const savedState = await DataStore.get(cookieClickerStoreKey);
            if (savedState) {
                setCookies(savedState.cookies);
                setUpgrades(savedState.upgrades);
            }
        };
        loadGameState();
    }, []);

    const saveGameState = async (newCookies: number, newUpgrades: number) => {
        await DataStore.set(cookieClickerStoreKey, { cookies: newCookies, upgrades: newUpgrades });
    };

    const handleCookieClick = (e: React.MouseEvent) => {
        const newCookies = cookies + 1 + upgrades;
        setCookies(newCookies);
        saveGameState(newCookies, upgrades);

        // Add a new floating number
        const rect = e.currentTarget.getBoundingClientRect();
        const id = Date.now(); // Unique ID for each floating number
        setFloatingNumbers(prev => [
            ...prev,
            {
                id,
                value: 1 + upgrades,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            },
        ]);

        // Remove the floating number after animation
        setTimeout(() => {
            setFloatingNumbers(prev => prev.filter(num => num.id !== id));
        }, 1000); // Match animation duration
    };

    const handleUpgradeClick = () => {
        if (cookies >= upgrades * 26) {
            const newCookies = cookies - upgrades * 26;
            const newUpgrades = upgrades + 1;
            setCookies(newCookies);
            setUpgrades(newUpgrades);
            saveGameState(newCookies, newUpgrades);
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
                        <div className="cookie-clicker-container">
                            <img
                                src="https://raw.githubusercontent.com/programminglaboratorys/resources/main/Vencord.cookieClicker/cookie.svg"
                                alt="Cookie"
                                className="cookie-clicker-image"
                                onClick={handleCookieClick}
                                draggable={false}
                            />
                            {floatingNumbers.map(number => (
                                <div
                                    key={number.id}
                                    className="floating-number"
                                    style={{
                                        left: number.x,
                                        top: number.y,
                                    }}
                                >
                                    +{number.value}
                                </div>
                            ))}
                        </div>
                        <p className="cookie-clicker-stats">Cookies: {cookies}</p>
                        <button
                            className="cookie-clicker-button"
                            onClick={handleUpgradeClick}
                            disabled={cookies < upgrades * 26}
                        >
                            Upgrade ({upgrades * 26} cookies)
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
