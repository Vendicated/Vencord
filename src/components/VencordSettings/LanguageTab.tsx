/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./languageTab.css";

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { getLanguage, Languages, LanguageType } from "@languages/Language";
import { Margins } from "@utils/margins";
import { classes, identity } from "@utils/misc";
import { Button, Card, Forms, React, Select, useState } from "@webpack/common";

const cl = classNameFactory("vc-languages-");
const langData = getLanguage("components");

function ReloadRequiredCard({ required }: { required: boolean; }) {
    const l = langData.VencordSettings.LanguageTab.ReloadRequiredCard;
    return (
        <Card className={cl("info-card", { "restart-card": required })}>
            {required ? (
                <>
                    <Forms.FormTitle tag="h5">{l.required}</Forms.FormTitle>
                    <Forms.FormText className={cl("dep-text")}>
                        {l.info}
                    </Forms.FormText>
                    <Button onClick={() => location.reload()} className={cl("restart-button")}>
                        {l.restartButton}
                    </Button>
                </>
            ) : (
                <>
                    <Forms.FormTitle tag="h5">{l.translation}</Forms.FormTitle>
                    <Forms.FormText>{l.changeInfo}</Forms.FormText>
                    <Forms.FormText>{l.notOfficial}</Forms.FormText>
                </>
            )}
        </Card>
    );
}

function LanguageTab() {
    const settings = useSettings();
    const l = langData.VencordSettings.LanguageTab.LanguageTab;
    const [languageChanged, setLanguageChanged] = useState(false);

    const languageIsSelected = (value: string) => {
        if (settings.language !== value) {
            settings.language = value as LanguageType;
            setLanguageChanged(true);
        }
    };

    return (
        <SettingsTab title={l.title}>

            <ReloadRequiredCard required={languageChanged} />

            <Forms.FormTitle tag="h5" className={classes(Margins.top20, Margins.bottom8)}>
                {l.chooseLanguage}
            </Forms.FormTitle>
            <Select
                className={Margins.top8}
                placeholder={l.languages}
                options={Object.entries(Languages).map(([lang, label]) => ({
                    label: label,
                    value: lang
                }))}
                select={value => languageIsSelected(value)}
                isSelected={value => settings.language === value}
                serialize={identity} />

        </SettingsTab>
    );
}


export default wrapTab(LanguageTab, langData.VencordSettings.LanguageTab.wrapTab);
