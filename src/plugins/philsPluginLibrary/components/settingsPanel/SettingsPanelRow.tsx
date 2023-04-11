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

import { classes } from "@utils/misc";
import React from "react";

import { panelClasses } from "../../discordModules";

export interface SettingsPanelRowProps {
    children: React.ComponentProps<"div">["children"];
}

export const SettingsPanelRow = ({ children }: SettingsPanelRowProps) => {
    return (
        <div
            className={classes(panelClasses.actionButtons)}
            style={{ padding: 0 }}
        >
            {children}
        </div>
    );
};
