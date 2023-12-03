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

import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms, SearchableSelect, Switch } from "@webpack/common";

import { settings } from "./settings";
import { cl } from "./utils";


function AutoTranslateToggle() {
    const value = settings.use(["autoTranslate"]).autoTranslate;

    return (
        <Switch
            value={value}
            onChange={v => settings.store.autoTranslate = v}
            note={settings.def.autoTranslate.description}
            hideBorder
        >
            Auto Translate
        </Switch>
    );
}

function AutoDecryptToggle() {
    const value = settings.use(["autoDecrypt"]).autoDecrypt;

    return (
        <Switch
            value={value}
            onChange={v => settings.store.autoDecrypt = v}
            note={settings.def.autoDecrypt.description}
            hideBorder
        >
            Auto Decrypt
        </Switch>
    );
}

function VersionSelector() {
    const settingsKey = "version";
    const currentValue = settings.use([settingsKey])[settingsKey];

    const options = [
        { label: "Daragcrypt", value: 1 },
        { label: "Jihad", value: 2 },
    ];

    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">
                {settings.def[settingsKey].description}
            </Forms.FormTitle>

            <SearchableSelect
                options={options}
                value={options.find(o => o.value === currentValue)}
                placeholder={"Select a version"}
                maxVisibleItems={2}
                closeOnSelect={true}
                onChange={v => settings.store[settingsKey] = v}
            />
        </section>
    );
}


export function TranslateModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Translate
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormDivider className={Margins.bottom16} />

                <AutoTranslateToggle />
                <AutoDecryptToggle />

                <Forms.FormDivider className={Margins.bottom16} />

                <VersionSelector />
            </ModalContent>
        </ModalRoot>
    );
}
