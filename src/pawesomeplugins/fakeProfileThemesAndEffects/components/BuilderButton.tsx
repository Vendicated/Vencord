/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Text, Tooltip } from "@webpack/common";
import type { ComponentProps } from "react";

export interface BuilderButtonProps {
    label?: string | undefined;
    tooltip?: string | undefined;
    selectedStyle?: ComponentProps<"div">["style"];
    buttonProps?: ComponentProps<"div"> | undefined;
}

export const BuilderButton = ({ label, tooltip, selectedStyle, buttonProps }: BuilderButtonProps) => (
    <Tooltip text={tooltip} shouldShow={!!tooltip}>
        {tooltipProps => (
            <div style={{ width: "60px" }}>
                <div
                    {...tooltipProps}
                    {...buttonProps}
                    aria-label={label}
                    role="button"
                    tabIndex={0}
                    style={{
                        ...selectedStyle ?? { border: "2px dashed var(--header-secondary)" },
                        display: "grid",
                        placeItems: "center",
                        height: "60px",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
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
                        style={{
                            marginTop: "4px",
                            textAlign: "center"
                        }}
                    >
                        {label}
                    </Text>
                )}
            </div>
        )}
    </Tooltip>
);
