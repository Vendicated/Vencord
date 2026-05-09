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

import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Margins } from "@utils/margins";
import { RenderModalProps } from "@vencord/discord-types";
import { Forms, openModal, SearchableSelect, useMemo } from "@webpack/common";
import { Modal } from "@webpack/common/modalV2";

import { settings } from "./settings";
import { getLanguages } from "./utils";

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
                value={options.find(o => o.value === currentValue)?.value}
                placeholder="Select a language"
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


function TranslateModal({ rootProps }: { rootProps: RenderModalProps; }) {
    return (
        <Modal
            {...rootProps}
            title="Translate"
        >
            {LanguageSettingKeys.map(s => (
                <LanguageSelect
                    key={s}
                    settingsKey={s}
                    includeAuto={s.endsWith("Input")}
                />
            ))}

            <Divider className={Margins.bottom16} />

            <AutoTranslateToggle />
        </Modal>
    );
}

export function openTranslateModal() {
    openModal(props => <TranslateModal rootProps={props} />);
}
