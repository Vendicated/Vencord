/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

interface ControlButtonProps {
    id: string;
    icon: string;
    title: string;
    onClick: () => void;
    active?: boolean;
}

export const ControlButton: React.FC<ControlButtonProps> = ({ id, icon, title, onClick, active }) => {
    return (
        <button
            id={id}
            title={title}
            onClick={e => {
                e.stopPropagation();
                onClick();
            }}
            className={`vc-popoutplus-control-btn${active ? " vc-popoutplus-active" : ""}`}
        >
            {icon}
        </button>
    );
};
