/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Menu } from "@webpack/common";
import { ReactElement } from "react";

import { preload, unload } from "./images";
import { cl } from "./ui";
import openQrModal from "./ui/modals/QrModal";

const qrModalOpen = false;
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
                        {getIntlMessage("USER_SETTINGS_SCAN_QR_CODE")}
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
                match: /handleGlobalPaste:(\i)/,
                replace: "handleGlobalPaste:(...args)=>!$self.qrModalOpen&&$1(...args)",
            },
        },
        // Insert a Scan QR Code button in the My Account tab
        {
            find: "UserSettingsAccountProfileCard",
            replacement: {
                // Find the Edit User Profile button and insert our custom button.
                // A bit jank, but whatever
                match: /,(\(.{1,90}#{intl::USER_SETTINGS_EDIT_USER_PROFILE}\),onClick:\i\}\))/,
                replace: ",$self.insertScanQrButton($1)",
            },
        },
        // Insert a Scan QR Code MenuItem in the Swith Accounts popout
        {
            find: 'id:"manage-accounts"',
            replacement: {
                match: /(id:"manage-accounts",.*?)}\)\)(,\i)/,
                replace: "$1}),$self.ScanQrMenuItem)$2"
            }
        },

        // Insert a Scan QR Code button in the Settings sheet
        {
            find: ".isInputProfileCustom()",
            replacement: {
                match: /\.CONNECTIONS/,
                replace: "$&,\"SCAN_QR_CODE\""
            }
        },
        // Insert a Scan QR Code button in the Settings sheet (part 2)
        {
            find: ".PRIVACY_ENCRYPTION_VERIFIED_DEVICES_V2]",
            replacement: {
                match: /\.CLIPS]:{.*?},/,
                replace: "$&\"SCAN_QR_CODE\":$self.ScanQrSettingsSheet,"
            }
        }
    ],

    qrModalOpen,

    insertScanQrButton: (button: ReactElement) => (
        <div className={cl("settings-btns")}>
            <Button size={Button.Sizes.SMALL} onClick={openQrModal}>
                {getIntlMessage("USER_SETTINGS_SCAN_QR_CODE")}
            </Button>
            {button}
        </div>
    ),
    get ScanQrMenuItem() {
        return <Menu.MenuItem id="scan-qr" label={getIntlMessage("USER_SETTINGS_SCAN_QR_CODE")} action={openQrModal} />;
    },
    get ScanQrSettingsSheet() {
        return {
            section: getIntlMessage("USER_SETTINGS_SCAN_QR_CODE"),
            onClick: openQrModal,
            searchableTitles: [getIntlMessage("USER_SETTINGS_SCAN_QR_CODE")],
            label: getIntlMessage("USER_SETTINGS_SCAN_QR_CODE"),
            ariaLabel: getIntlMessage("USER_SETTINGS_SCAN_QR_CODE")
        };
    },

    start() {
        preload();
    },

    stop() {
        unload();
    },
});
