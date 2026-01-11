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
            style={{
                background: active ? "rgba(88, 101, 242, 0.9)" : "rgba(0, 0, 0, 0.6)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                width: "32px",
                height: "32px",
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: active ? 1 : 0.8,
                transition: "opacity 0.2s, background 0.2s, transform 0.1s",
                pointerEvents: "auto",
            }}
            className="vc-popout-control-btn"
        >
            {icon}
        </button>
    );
};
