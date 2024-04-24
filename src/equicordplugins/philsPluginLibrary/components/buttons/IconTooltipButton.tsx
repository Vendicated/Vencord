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

import { Flex } from "@components/Flex";
import { Button, Tooltip } from "@webpack/common";
import React from "react";


export interface IconTooltipButtonProps {
    tooltipText?: string;
    icon?: JSX.Element;
}

export const IconTooltipButton = (props: typeof Button["defaultProps"] & IconTooltipButtonProps) => {
    return (
        <Tooltip text={props.tooltipText}>
            {tooltipProps => <Button
                size={Button.Sizes.ICON}
                {...props as any}
                style={{ aspectRatio: 1, maxHeight: "32px", boxSizing: "border-box", ...props.style }}
            >
                <Flex style={{ justifyContent: "center", alignItems: "center", width: 24, height: 24 }}>
                    {props.icon}
                </Flex>
                <span {...tooltipProps} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
            </Button>}
        </Tooltip >
    );
};
