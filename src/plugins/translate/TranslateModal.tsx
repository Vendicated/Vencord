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

import { DataStore } from "@api/index";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms, SearchableSelect, Switch, useEffect, useMemo, useState } from "@webpack/common";

import { Languages } from "./languages";
import { settings } from "./settings";
import { cl } from "./utils";

const LanguageSettingKeys = ["receivedInput", "receivedOutput", "sentInput", "sentOutput"] as const;

function LanguageSelect({ settingsKey, includeAuto }: { settingsKey: typeof LanguageSettingKeys[number]; includeAuto: boolean; }) {
    const currentValue = settings.use([settingsKey])[settingsKey];

    const options = useMemo(
        () => {
            const options = Object.entries(Languages).map(([value, label]) => ({ value, label }));
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

export function AutoTranslateRecievedSetting() {
    const currentChannel = Vencord.Util.getCurrentChannel();

    const [state, setState] = useState(false);

    useEffect(() => {
        DataStore.get("autoTranslateReceived").then(state => {
            setState(state[currentChannel.id] ?? false);
        });
    }, []);

    async function handleChange(state: boolean) {
        const newState = { ...await DataStore.get("autoTranslateReceived") };
        newState[currentChannel.id] = state;

        await DataStore.set("autoTranslateReceived", newState).then(() => setState(state));
    }

    return (
        <Forms.FormSection>
            <Switch
                value={state}
                onChange={handleChange}
                note={`Automatically translate all messages in the current channel (#${currentChannel.name})`}
                hideBorder
                style={{ marginBottom: "0.5em" }}
            >
                Auto Translate Recieved Messages
            </Switch>
        </Forms.FormSection>
    );
}


export function TranslateModal({ rootProps }: { rootProps: ModalProps; }) {
    const { autoTranslate } = settings.use(["autoTranslate"]);

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
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

                <Forms.FormDivider className={Margins.bottom16} />

                <Switch
                    value={autoTranslate}
                    onChange={v => settings.store.autoTranslate = v}
                    note={settings.def.autoTranslate.description}
                    hideBorder
                >
                    Auto Translate
                </Switch>
                <AutoTranslateRecievedSetting />
            </ModalContent>
        </ModalRoot>
    );
}
