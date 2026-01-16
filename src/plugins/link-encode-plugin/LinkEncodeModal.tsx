/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms } from "@webpack/common";

import { settings } from "./settings";
import { cl } from "./utils";

export function LinkEncodeModal({ rootProps }: { rootProps: ModalProps; }) {
    const autoEncode = settings.use(["autoEncode"]).autoEncode;
    const stealthMode = settings.use(["stealthMode"]).stealthMode;

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Message Encryption
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormText className={Margins.bottom16}>
                    Encrypt your messages to bypass Discord's automated link filtering. Each message is protected with a unique encryption key and formatted to blend in with normal chat.
                    <br /><br />
                    <strong>Stealth Mode</strong> uses emoji-based formatting (🔐... | 🗝️...) that appears more natural and is less likely to trigger automated detection systems.
                    <br /><br />
                    To decrypt messages, hover over them and click the <strong>Decrypt Message</strong> button in the tooltip. The decrypted content will appear below the message.
                </Forms.FormText>

                <Divider className={Margins.bottom16} />

                <FormSwitch
                    title="Auto-Encrypt Messages"
                    description={settings.def.autoEncode.description}
                    value={autoEncode}
                    onChange={v => settings.store.autoEncode = v}
                    hideBorder
                />

                <FormSwitch
                    title="Stealth Mode"
                    description={settings.def.stealthMode.description}
                    value={stealthMode}
                    onChange={v => settings.store.stealthMode = v}
                    hideBorder
                />

                <FormSwitch
                    title="Show Encryption Tooltip"
                    description={settings.def.showEncodedTooltip.description}
                    value={settings.use(["showEncodedTooltip"]).showEncodedTooltip}
                    onChange={v => settings.store.showEncodedTooltip = v}
                    hideBorder
                />
            </ModalContent>
        </ModalRoot>
    );
}
