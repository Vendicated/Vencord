/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

const iconClass = "vc-popoutplus-control-icon";

export const PinIcon: React.FC = () => (
    <svg className={iconClass} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16.91 5C18.61 5 20 3.48 20 1.6v-.1a.5.5 0 0 0-.5-.5h-15a.5.5 0 0 0-.5.5v.1C4 3.49 5.38 5 7.09 5H8v4.35l-3.39 3.26A2 2 0 0 0 4 14.05V15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-.95a2 2 0 0 0-.61-1.44L16 9.35V5h.91ZM13.37 17.25c.33 0 .56.3.5.61l-1.08 4.75a.5.5 0 0 1-.49.39h-.6a.5.5 0 0 1-.49-.39l-1.07-4.75a.5.5 0 0 1 .49-.61h2.74Z" />
    </svg>
);

export const EyeIcon: React.FC = () => (
    <svg className={iconClass} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 5C5.648 5 1 12 1 12s4.648 7 11 7 11-7 11-7-4.648-7-11-7Zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5Z" />
        <circle fill="currentColor" cx="12" cy="12" r="3" />
    </svg>
);

export const EyeOffIcon: React.FC = () => (
    <svg className={iconClass} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M1.3 21.3a1 1 0 1 0 1.4 1.4l20-20a1 1 0 0 0-1.4-1.4l-20 20ZM12 17c-2.76 0-5-2.24-5-5 0-.77.18-1.5.49-2.14L4.14 13.2A12.73 12.73 0 0 0 1 12s4.65-7 11-7c1.27 0 2.47.24 3.58.66l-1.8 1.8A4.99 4.99 0 0 0 7 12c0 .34.04.67.1.99l-2.24 2.24A12.73 12.73 0 0 1 1 12s4.65-7 11-7c.77 0 1.51.08 2.22.22l1.88-1.88A12.73 12.73 0 0 0 12 3C5.65 3 1 12 1 12a12.73 12.73 0 0 0 3.14 3.2l-2.24 2.24A12.73 12.73 0 0 1 1 12s4.65-7 11-7Z" />
        <path fill="currentColor" d="M12 17c2.76 0 5-2.24 5-5 0-.77-.18-1.5-.49-2.14l3.35-3.35A12.73 12.73 0 0 1 23 12s-4.65 7-11 7a10.6 10.6 0 0 1-3.58-.66l1.8-1.8c.56.28 1.2.46 1.78.46Zm0-10c-2.76 0-5 2.24-5 5 0 .77.18 1.5.49 2.14L3.86 17.8A12.73 12.73 0 0 1 1 12s4.65-7 11-7c1.27 0 2.47.24 3.58.66l-1.8 1.8A4.99 4.99 0 0 0 12 7Z" />
    </svg>
);

export const FitIcon: React.FC = () => (
    <svg className={iconClass} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V5.41l-4.3 4.3a1 1 0 0 1-1.4-1.42L18.58 4H15a1 1 0 0 1-1-1Z" />
        <path fill="currentColor" d="M10 21a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6a1 1 0 1 1 2 0v3.59l4.3-4.3a1 1 0 0 1 1.4 1.42L5.42 20H9a1 1 0 0 1 1 1Z" />
        <path fill="currentColor" d="M10 3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V5.41l4.3 4.3a1 1 0 0 0 1.4-1.42L5.42 4H9a1 1 0 0 0 1-1Z" />
        <path fill="currentColor" d="M14 21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 1 0-2 0v3.59l-4.3-4.3a1 1 0 0 0-1.4 1.42L18.58 20H15a1 1 0 0 0-1 1Z" />
    </svg>
);

export const FullscreenIcon: React.FC = () => (
    <svg className={iconClass} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 6c0-1.1.9-2 2-2h3a1 1 0 0 0 0-2H6a4 4 0 0 0-4 4v3a1 1 0 0 0 2 0V6ZM4 18c0 1.1.9 2 2 2h3a1 1 0 1 1 0 2H6a4 4 0 0 1-4-4v-3a1 1 0 1 1 2 0v3ZM18 4a2 2 0 0 1 2 2v3a1 1 0 1 0 2 0V6a4 4 0 0 0-4-4h-3a1 1 0 1 0 0 2h3ZM20 18a2 2 0 0 1-2 2h-3a1 1 0 1 0 0 2h3a4 4 0 0 0 4-4v-3a1 1 0 1 0-2 0v3Z" />
    </svg>
);
