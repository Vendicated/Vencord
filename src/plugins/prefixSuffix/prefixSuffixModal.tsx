/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms, Switch, TextInput } from "@webpack/common";

import { settings } from "./settings";

const cl = classNameFactory("vc-prefixSuffix-");
const StringSettingKeys = ["prefix", "suffix"] as const;

function PrefixSuffixSettings({ settingsKey }: { settingsKey: typeof StringSettingKeys[number]; }) {
    return (
        <section className={Margins.bottom16}>
            <Forms.FormTitle tag="h3">
                {settingsKey}
            </Forms.FormTitle>
            <Forms.FormText tag="h5">
                {settings.def[settingsKey].description}
            </Forms.FormText>
            <TextInput
                value={settings.store[settingsKey]}
                onChange={v => settings.store[settingsKey] = v}
            />
        </section>
    );
}

function AutoPrefixSuffixToggle() {
    return (
        <Switch
            value={settings.use(["autoPrefixSuffix"]).autoPrefixSuffix}
            onChange={v => settings.store.autoPrefixSuffix = v}
            note={settings.def.autoPrefixSuffix.description}
            hideBorder
        >
            AutoPrefixSuffix
        </Switch>
    );
}

export function PrefixSuffixModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    PrefixSuffix
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                {StringSettingKeys.map(s => (
                    <PrefixSuffixSettings
                        key={s}
                        settingsKey={s}
                    />
                ))}

                <Forms.FormDivider className={Margins.bottom16} />

                <AutoPrefixSuffixToggle />
            </ModalContent>
        </ModalRoot>
    );
}
