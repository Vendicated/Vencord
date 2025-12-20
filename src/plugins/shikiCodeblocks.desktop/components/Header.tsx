/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Language } from "@plugins/shikiCodeblocks.desktop/api/languages";
import { DeviconSetting } from "@plugins/shikiCodeblocks.desktop/types";
import { cl } from "@plugins/shikiCodeblocks.desktop/utils/misc";

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
