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

import { React } from "@webpack/common";


export interface SettingsPanelProps {
    children: React.ComponentProps<"div">["children"];
}

export const SettingsPanel = ({ children }: SettingsPanelProps) => {
    return (
        <div
            style={{
                backgroundColor: "var(--background-secondary-alt)",
                borderBottom: "1px solid var(--background-modifier-accent)",
                padding: "0.5em"
            }}
        >
            <div
                style={{
                    display: "flex",
                    gap: "0.5em",
                    flexDirection: "column"
                }}
            >
                {children}
            </div>
        </div>
    );
};
