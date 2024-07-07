/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { OpenExternalIcon } from "@components/Icons";
import { OptionType } from "@utils/types";
import { Button, Clipboard, Forms, Toasts } from "@webpack/common";

import { authorizeUser, deauthorizeUser } from "./auth";

const cl = classNameFactory("vce-");

export const settings = definePluginSettings({
    hideWarningCard: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Hide the warning card displayed at the top of the theme library tab",
        restartNeeded: false,
    },
    buttons: {
        type: OptionType.COMPONENT,
        description: "ThemeLibrary Buttons",
        component: () => {
            const handleClick = async () => {
                const token = await DataStore.get("ThemeLibrary_uniqueToken");

                if (!token) return Toasts.show({
                    message: "No token to copy, try authorizing first!",
                    id: Toasts.genId(),
                    type: Toasts.Type.FAILURE,
                    options: {
                        duration: 2.5e3,
                        position: Toasts.Position.BOTTOM
                    }
                });

                Clipboard.copy(token);

                Toasts.show({
                    message: "Copied to Clipboard!",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                    options: {
                        duration: 2.5e3,
                        position: Toasts.Position.BOTTOM
                    }
                });
            };

            return (
                <Forms.FormSection>
                    <Forms.FormTitle tag="h3" style={{ marginTop: 0, marginBottom: 8 }}>ThemeLibrary Auth</Forms.FormTitle>
                    <div className={cl("button-grid")}>
                        <Button onClick={() => authorizeUser()}>
                            Authorize with ThemeLibrary
                        </Button>
                        <Button onClick={handleClick}>
                            Copy ThemeLibrary Token
                        </Button>
                        <Button color={Button.Colors.RED} onClick={() => deauthorizeUser()}>
                            Deauthorize ThemeLibrary
                        </Button>
                    </div>
                    <Forms.FormTitle tag="h3" style={{ marginTop: 8, marginBottom: 8 }}>Theme Removal</Forms.FormTitle>
                    <Forms.FormText style={{ marginTop: 0, marginBottom: 8 }}> All Theme Authors are given credit in the theme info, no source has been modified, if you wish your theme to be removed anyway, open an Issue by clicking below.</Forms.FormText>
                    <div className={cl("button-grid")}>
                        <Button onClick={() => VencordNative.native.openExternal("https://github.com/Faf4a/plugins/issues/new?labels=removal&projects=&template=request_removal.yml&title=Theme+Removal")}>
                            Request Theme Removal <OpenExternalIcon height={16} width={16} />
                        </Button>
                    </div>
                </Forms.FormSection>
            );
        }
    }
});
