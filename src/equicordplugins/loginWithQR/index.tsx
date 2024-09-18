/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, i18n, Menu, TabBar } from "@webpack/common";
import { ReactElement } from "react";

import { preload, unload } from "./images";
import { cl, QrCodeIcon } from "./ui";
import openQrModal from "./ui/modals/QrModal";

export default definePlugin({
    name: "LoginWithQR",
    description: "Allows you to login to another device by scanning a login QR code, just like on mobile!",
    authors: [EquicordDevs.nexpid],

    settings: definePluginSettings({
        scanQr: {
            type: OptionType.COMPONENT,
            description: "Scan a QR code",
            component() {
                if (!Vencord.Plugins.plugins.LoginWithQR.started)
                    return (
                        <Forms.FormText>
                            Enable the plugin and restart your client to scan a login QR code
                        </Forms.FormText>
                    );

                return (
                    <Button size={Button.Sizes.SMALL} onClick={openQrModal}>
                        {i18n.Messages.USER_SETTINGS_SCAN_QR_CODE}
                    </Button>
                );
            },
        },
    }),

    patches: [
        // Prevent paste event from firing when the QRModal is open
        {
            find: ".clipboardData&&(",
            replacement: {
                // Find the handleGlobalPaste & handlePaste functions and prevent
                // them from firing when the modal is open. Does this have any
                // side effects? Maybe
                match: /handle(Global)?Paste:(\i)(}|,)/g,
                replace: "handle$1Paste:(...args)=>!$self.qrModalOpen&&$2(...args)$3",
            },
        },
        // Insert a Scan QR Code button in the My Account tab
        {
            find: "UserSettingsAccountProfileCard",
            replacement: {
                // Find the Edit User Profile button and insert our custom button.
                // A bit jank, but whatever
                match: /,(.{11}\.Button,.{58}\.USER_SETTINGS_EDIT_USER_PROFILE}\))/,
                replace: ",$self.insertScanQrButton($1)",
            },
        },
        // Insert a Scan QR Code MenuItem in the simplified user popout
        {
            find: "Messages.MULTI_ACCOUNT_MENU_LABEL",
            replacement: {
                // Insert our own MenuItem before the Switch Accounts button
                match: /children:\[(.{0,54}id:"switch-accounts")/,
                replace: "children:[$self.ScanQrMenuItem,$1",
            },
        },
        // Add a Scan QR entry to the settings TabBar
        {
            find: ".BILLING_SETTINGS,",
            replacement: {
                match: /((\i\.settings)\.forEach.+?(\i).push\(.+}\)}\))/,
                replace: (_, original, settings, elements) =>
                    `${original},${settings}?.[0]=="ACCOUNT"` +
                    `&&${elements}.push({section:"CUSTOM",element:$self.ScanQrTabBarComponent})`,
            },
        },
    ],

    qrModalOpen: false,

    insertScanQrButton: (button: ReactElement) => (
        <div className={cl("settings-btns")}>
            <Button size={Button.Sizes.SMALL} onClick={openQrModal}>
                {i18n.Messages.USER_SETTINGS_SCAN_QR_CODE}
            </Button>
            {button}
        </div>
    ),

    get ScanQrMenuItem() {
        return (
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id="scan-qr"
                    label={i18n.Messages.USER_SETTINGS_SCAN_QR_CODE}
                    icon={QrCodeIcon}
                    action={openQrModal}
                    showIconFirst
                />
            </Menu.MenuGroup>
        );
    },

    ScanQrTabBarComponent: () => (
        <TabBar.Item id="Scan QR Code" onClick={openQrModal}>
            {i18n.Messages.USER_SETTINGS_SCAN_QR_CODE}
        </TabBar.Item>
    ),

    start() {
        // Preload images
        preload();
    },

    stop() {
        unload?.();
    },
});
