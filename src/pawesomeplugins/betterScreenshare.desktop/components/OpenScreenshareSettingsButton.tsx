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

import { Button } from "@webpack/common";
import React from "react";

import { openScreenshareModal } from "../modals";

export interface OpenScreenshareSettingsButtonProps {
    title?: string;
}

export const OpenScreenshareSettingsButton = (props: OpenScreenshareSettingsButtonProps) => {
    return (
        <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.PRIMARY}
            onClick={openScreenshareModal}
        >
            {props.title ? props.title : "Screenshare Settings"}
        </Button>
    );
};
