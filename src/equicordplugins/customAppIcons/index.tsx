/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Link } from "@components/Link";
import { Devs, EquicordDevs } from "@utils/constants";
import { localStorage } from "@utils/localStorage";
import { closeAllModals, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import { Button, FluxDispatcher, Forms, React, showToast, Toasts } from "@webpack/common";

import AppIconModal from "./AppIconModal";

function removeAppIcon() {
    const current_icon = findByProps("getCurrentDesktopIcon").getCurrentDesktopIcon();
    let icons = JSON.parse(localStorage.getItem("vc_app_icons") || "[]");
    const index = icons.findIndex(icon => current_icon === icon.id);
    if (index !== -1) {
        icons = icons.filter(e => e.id !== current_icon);
        delete findByProps("UZ", "QA").QA[current_icon];
        delete findByProps("UZ", "QA").UZ[findByProps("UZ", "QA").UZ.findIndex((icon => current_icon === icon?.id))];
        localStorage.setItem("vc_app_icons", JSON.stringify(icons));
        showToast("Icon successfully deleted!", Toasts.Type.SUCCESS);
        FluxDispatcher.dispatch({
            type: "APP_ICON_UPDATED",
            id: "AppIcon"
        });
    } else {
        showToast("Cannot delete native App Icons!", Toasts.Type.FAILURE);
        return;
    }

}


export default definePlugin({
    name: "CustomAppIcons",
    description: "Add/upload custom (In-)App Icons.",
    authors: [Devs.HappyEnderman, EquicordDevs.SerStars],
    patches: [
        {
            find: /\i\.\i\.APP_ICON_UPSELL/,
            replacement: [
                {
                    match: /\w+\.jsx\)\(\w+,{markAsDismissed:\w+,isCoachmark:\w+}\)/,
                    replace(str) {
                        return str + ",$self.addButtons()";
                    }
                }
            ]
        }
    ],


    start() {
        console.log("Well hello there!, CustomAppIcons has started :)");
        const appIcons = JSON.parse(localStorage.getItem("vc_app_icons") ?? "[]");
        for (const icon of appIcons) {
            findByProps("UZ", "QA").UZ.push(icon);
            findByProps("UZ", "QA").QA[icon.id] = icon;
        }
    },
    stop() {

    },
    addButtons() {

        const { editorFooter } = findByProps("editorFooter");
        return (
            <>
                <Button color={Button.Colors.BRAND_NEW} size={Button.Sizes.MEDIUM} className={editorFooter} onClick={() => {
                    openModal(props => <AppIconModal {...props} />);
                }}>
                    Add Custom App Icon
                </Button>
                <Button color={Button.Colors.RED} size={Button.Sizes.MEDIUM} className={editorFooter} onClick={removeAppIcon}>
                    Remove Custom selected App Icon
                </Button>
            </>
        );
    },

    settingsAboutComponent: () => {
        return (
            <><Forms.FormTitle>
                <Forms.FormTitle>How to use?</Forms.FormTitle>
            </Forms.FormTitle>
                <Forms.FormText>
                    <Forms.FormText>Go to <Link href="/settings/appearance" onClick={e => { e.preventDefault(); closeAllModals(); FluxDispatcher.dispatch({ type: "USER_SETTINGS_MODAL_SET_SECTION", section: "Appearance" }); }}>Appearance Settings</Link> tab.</Forms.FormText>
                    <Forms.FormText>Scroll down to "In-app Icons" and click on "Preview App Icon".</Forms.FormText>
                    <Forms.FormText>And upload your own custom icon!</Forms.FormText>
                    <Forms.FormText>You can only use links when you are uploading your Custom Icon.</Forms.FormText>
                </Forms.FormText></>
        );
    }
});
