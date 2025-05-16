/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { closeAllModals } from "@utils/modal";
import { OptionType } from "@utils/types";
import { FluxDispatcher, Forms } from "@webpack/common";

import DecorSection from "./ui/components/DecorSection";

export const settings = definePluginSettings({
    changeDecoration: {
        type: OptionType.COMPONENT,
        component() {
            if (!Vencord.Plugins.plugins.Decor.started) return <Forms.FormText>
                Enable Decor and restart your client to change your avatar decoration.
            </Forms.FormText>;

            return <div>
                <DecorSection hideTitle hideDivider noMargin />
                <Forms.FormText type="description" className={classes(Margins.top8, Margins.bottom8)}>
                    You can also access Decor decorations from the <Link
                        href="/settings/profile-customization"
                        onClick={e => {
                            e.preventDefault();
                            closeAllModals();
                            FluxDispatcher.dispatch({ type: "USER_SETTINGS_MODAL_SET_SECTION", section: "Profile Customization" });
                        }}
                    >Profiles</Link> page.
                </Forms.FormText>
            </div>;
        }
    },
    agreedToGuidelines: {
        type: OptionType.BOOLEAN,
        description: "Agreed to guidelines",
        hidden: true,
        default: false
    }
});
