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

export function Header(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div style={{
            boxShadow: "var(--elevation-low)",
            gridColumn: "1/3",
            gridRow: "1/2",
            minHeight: "1px",
            zIndex: "1",
            padding: "0 16px 16px",
            display: "flex",
            alignItems: "center",
        }}>
            {props.children}
        </div>
    );
}
