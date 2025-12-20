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

import { classNameFactory } from "@utils/css";
import { Message } from "@vencord/discord-types";
import { useState } from "@webpack/common";

export const conversions = new Map<string, (conv: string) => void>();
const cl = classNameFactory("vc-converter-");
function Dismiss({ onDismiss }: { onDismiss: () => void; }) {
    return (
        <button
            onClick={onDismiss}
            className={cl("dismiss")}
        >
            Dismiss
        </button>
    );
}
// thanks <@408047304864432139>
export function ConvertIcon() {
    return (
        <svg
            viewBox="0 0 98 98"
            height={24}
            width={24}
            className={cl("icon")}
        >
            <path
                fill="currentColor"
                d="m50 16.668v-7.4609c0-1.875-2.25-2.7891-3.543-1.457l-11.664 11.625c-0.83594 0.83203-0.83594 2.125 0 2.957l11.625 11.625c1.332 1.293 3.582 0.375 3.582-1.5v-7.457c13.793 0 25 11.207 25 25 0 3.293-0.625 6.5-1.832 9.375-0.625 1.5-0.16797 3.207 0.95703 4.332 2.125 2.125 5.707 1.375 6.832-1.4141 1.543-3.793 2.375-7.9609 2.375-12.293 0-18.418-14.914-33.332-33.332-33.332zm0 58.332c-13.793 0-25-11.207-25-25 0-3.293 0.625-6.5 1.832-9.375 0.625-1.5 0.16797-3.207-0.95703-4.332-2.125-2.125-5.707-1.375-6.832 1.4141-1.543 3.793-2.375 7.9609-2.375 12.293 0 18.418 14.914 33.332 33.332 33.332v7.4609c0 1.875 2.25 2.7891 3.543 1.457l11.625-11.625c0.83203-0.83203 0.83203-2.125 0-2.957l-11.625-11.625c-1.293-1.293-3.543-0.375-3.543 1.5z" />
        </svg>
    );
}

export function SmallConvertIcon() {
    return (
        <svg
            viewBox="0 0 98 98"
            height={16}
            width={16}
            className={cl("icon")}
        >
            <path
                fill="currentColor"
                d="m50 16.668v-7.4609c0-1.875-2.25-2.7891-3.543-1.457l-11.664 11.625c-0.83594 0.83203-0.83594 2.125 0 2.957l11.625 11.625c1.332 1.293 3.582 0.375 3.582-1.5v-7.457c13.793 0 25 11.207 25 25 0 3.293-0.625 6.5-1.832 9.375-0.625 1.5-0.16797 3.207 0.95703 4.332 2.125 2.125 5.707 1.375 6.832-1.4141 1.543-3.793 2.375-7.9609 2.375-12.293 0-18.418-14.914-33.332-33.332-33.332zm0 58.332c-13.793 0-25-11.207-25-25 0-3.293 0.625-6.5 1.832-9.375 0.625-1.5 0.16797-3.207-0.95703-4.332-2.125-2.125-5.707-1.375-6.832 1.4141-1.543 3.793-2.375 7.9609-2.375 12.293 0 18.418 14.914 33.332 33.332 33.332v7.4609c0 1.875 2.25 2.7891 3.543 1.457l11.625-11.625c0.83203-0.83203 0.83203-2.125 0-2.957l-11.625-11.625c-1.293-1.293-3.543-0.375-3.543 1.5z" />
        </svg>
    );
}

export function ConverterAccessory({ message }: { message: Message; }) {
    const [conversion, setConversion] = useState<string>("");
    conversions.set(message.id, setConversion);
    if (!conversion) return null;
    return (
        <span className={cl("accessory")}>
            <SmallConvertIcon />
            {conversion}
            {" - "}
            <Dismiss onDismiss={() => setConversion("")} />
        </span>
    );
}
