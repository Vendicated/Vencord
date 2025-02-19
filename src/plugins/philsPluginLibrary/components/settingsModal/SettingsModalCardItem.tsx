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

import { Forms } from "@webpack/common";
import React from "react";

export interface SettingsModalCardItemProps extends Pick<React.ComponentProps<"div">,
    | "children"> {
    title?: string;
}

export const SettingsModalCardItem = ({ children, title }: SettingsModalCardItemProps) => {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.4em",
            width: "100%"
        }}>
            {title && <Forms.FormTitle tag="h5" style={{ margin: 0 }}>{title}</Forms.FormTitle>}
            {children}
        </div>
    );
};
