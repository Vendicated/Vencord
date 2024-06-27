/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./ExpandableHeader.css";

import { classNameFactory } from "@api/Styles";
import { Text, Tooltip, useState } from "@webpack/common";
import type { ReactNode } from "react";

const cl = classNameFactory("vc-expandableheader-");

export interface ExpandableHeaderProps {
    onMoreClick?: () => void;
    moreTooltipText?: string;
    onDropDownClick?: (state: boolean) => void;
    defaultState?: boolean;
    headerText: string;
    children: ReactNode;
    buttons?: ReactNode[];
    forceOpen?: boolean;
}

export function ExpandableHeader({
    children,
    onMoreClick,
    buttons,
    moreTooltipText,
    onDropDownClick,
    headerText,
    defaultState = false,
    forceOpen = false,
}: ExpandableHeaderProps) {
    const [showContent, setShowContent] = useState(defaultState || forceOpen);

    return (
        <>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
            }}>
                <Text
                    tag="h2"
                    variant="eyebrow"
                    style={{
                        color: "var(--header-primary)",
                        display: "inline"
                    }}
                >
                    {headerText}
                </Text>

                <div className={cl("center-flex")}>
                    {buttons ?? null}

                    {/* only show more button if callback is provided */}
                    {onMoreClick && (
                        <Tooltip text={moreTooltipText}>
                            {tooltipProps => (
                                <button
                                    {...tooltipProps}
                                    className={cl("btn")}
                                    onClick={onMoreClick}>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="var(--text-normal)"
                                    >
                                        <path d="M7 12.001c0-1.1046-.89543-2-2-2s-2 .8954-2 2c0 1.1045.89543 2 2 2s2-.8955 2-2Zm7 0c0-1.1046-.8954-2-2-2s-2 .8954-2 2c0 1.1045.8954 2 2 2s2-.8955 2-2Zm5-2c1.1046 0 2 .8954 2 2 0 1.1045-.8954 2-2 2s-2-.8955-2-2c0-1.1046.8954-2 2-2Z" />
                                    </svg>
                                </button>
                            )}
                        </Tooltip>
                    )}


                    <Tooltip text={showContent ? "Hide " + headerText : "Show " + headerText}>
                        {tooltipProps => (
                            <button
                                {...tooltipProps}
                                className={cl("btn")}
                                onClick={() => {
                                    setShowContent(v => !v);
                                    onDropDownClick?.(showContent);
                                }}
                                disabled={forceOpen}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="var(--text-normal)"
                                    transform={showContent ? "scale(1 -1)" : "scale(1 1)"}
                                >
                                    <path d="M16.59 8.59003 12 13.17 7.41 8.59003 6 10l6 6 6-6-1.41-1.40997Z" />
                                </svg>
                            </button>
                        )}
                    </Tooltip>
                </div>
            </div>
            {showContent && children}
        </>
    );
}
