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

const cl = classNameFactory("vc-expandableheader-");

export interface ExpandableHeaderProps {
    onMoreClick?: () => void;
    moreTooltipText?: string;
    onDropDownClick?: (state: boolean) => void;
    defaultState?: boolean;
    headerText: string;
    children: React.ReactNode;
    buttons?: React.ReactNode[];
}

export function ExpandableHeader({ children, onMoreClick, buttons, moreTooltipText, defaultState = false, onDropDownClick, headerText }: ExpandableHeaderProps) {
    const [showContent, setShowContent] = useState(defaultState);

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
                    {
                        buttons ?? null
                    }

                    {
                        onMoreClick && // only show more button if callback is provided
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
                                    >
                                        <path fill="var(--text-normal)" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z" />
                                    </svg>
                                </button>
                            )}
                        </Tooltip>
                    }


                    <Tooltip text={showContent ? "Hide " + headerText : "Show " + headerText}>
                        {tooltipProps => (
                            <button
                                {...tooltipProps}
                                className={cl("btn")}
                                onClick={() => {
                                    setShowContent(v => !v);
                                    onDropDownClick?.(showContent);
                                }}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    transform={showContent ? "scale(1 -1)" : "scale(1 1)"}
                                >
                                    <path fill="var(--text-normal)" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z" />
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
