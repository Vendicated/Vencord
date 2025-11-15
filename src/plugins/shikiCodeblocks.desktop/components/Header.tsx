/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Language } from "../api/languages";
import { DeviconSetting } from "../types";
import { cl } from "../utils/misc";

export interface HeaderProps {
    langName?: string;
    useDevIcon: DeviconSetting;
    shikiLang: Language | null;
}

export function Header({ langName, useDevIcon, shikiLang }: HeaderProps) {
    if (!langName) return <></>;

    return (
        <div className={cl("lang")}>
            {useDevIcon !== DeviconSetting.Disabled && shikiLang?.devicon && (
                <i
                    className={`${cl("devicon")} devicon-${shikiLang.devicon}${useDevIcon === DeviconSetting.Color ? " colored" : ""}`}
                />
            )}
            {langName}
        </div>
    );
}
