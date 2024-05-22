/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, Tooltip } from "@webpack/common";
import type { CSSProperties } from "react";

interface BuilderButtonProps {
    label?: string;
    tooltip?: string;
    selectedStyle?: CSSProperties;
    onClick?: () => void;
}

export function BuilderButton({ label, tooltip, selectedStyle, onClick }: BuilderButtonProps) {
    return (
        <Tooltip text={tooltip} shouldShow={!!tooltip}>
            {({ onMouseLeave, onMouseEnter }) => (
                <div style={{ width: "60px" }}>
                    <div
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        role="button"
                        tabIndex={0}
                        style={{
                            ...selectedStyle || { border: "2px dashed var(--header-secondary)" },
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "grid",
                            height: "60px",
                            placeItems: "center"
                        }}
                        onClick={onClick}
                    >
                        {!selectedStyle && (
                            <svg
                                fill="var(--header-secondary)"
                                width="40%"
                                height="40%"
                                viewBox="0 0 144 144"
                            >
                                <path d="M144 64H80V0H64v64H0v16h64v64h16V80h64Z" />
                            </svg>
                        )}
                    </div>
                    {!!label && (
                        <Text
                            color="header-secondary"
                            variant="text-xs/normal"
                            tag="div"
                            style={{ textAlign: "center" }}
                        >
                            {label}
                        </Text>
                    )}
                </div>
            )}
        </Tooltip>
    );
}
