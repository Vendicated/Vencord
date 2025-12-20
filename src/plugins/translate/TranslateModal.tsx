/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms, SearchableSelect, useMemo } from "@webpack/common";

import { settings } from "./settings";
import { cl, getLanguages } from "./utils";

const LanguageSettingKeys = ["receivedInput", "receivedOutput", "sentInput", "sentOutput"] as const;

function LanguageSelect({ settingsKey, includeAuto }: { settingsKey: typeof LanguageSettingKeys[number]; includeAuto: boolean; }) {
    const currentValue = settings.use([settingsKey])[settingsKey];

    const options = useMemo(
        () => {
            const options = Object.entries(getLanguages()).map(([value, label]) => ({ value, label }));
            if (!includeAuto)
                options.shift();

            return options;
        }, []
    );

    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">
                {settings.def[settingsKey].description}
            </Forms.FormTitle>

            <SearchableSelect
                options={options}
                value={options.find(o => o.value === currentValue)}
                placeholder={"Select a language"}
                maxVisibleItems={5}
                closeOnSelect={true}
                onChange={v => settings.store[settingsKey] = v}
            />
        </section>
    );
}

function AutoTranslateToggle() {
    const value = settings.use(["autoTranslate"]).autoTranslate;

    return (
        <FormSwitch
            title="Auto Translate"
            description={settings.def.autoTranslate.description}
            value={value}
            onChange={v => settings.store.autoTranslate = v}
            hideBorder
        />
    );
}


export function TranslateModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Translate
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                {LanguageSettingKeys.map(s => (
                    <LanguageSelect
                        key={s}
                        settingsKey={s}
                        includeAuto={s.endsWith("Input")}
                    />
                ))}

                <Divider className={Margins.bottom16} />

                <AutoTranslateToggle />
            </ModalContent>
        </ModalRoot>
    );
}
