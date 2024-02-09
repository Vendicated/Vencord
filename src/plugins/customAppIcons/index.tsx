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

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, Button, ButtonLooks } from "@webpack/common";


export default definePlugin({
    name: "CustomAppIcons",
    description: "Allows you to add your own app icons!",
    authors: [Devs.HappyEnderman],

    patches: [],

    options: {
        addButton: {
            type: OptionType.COMPONENT,
            description: "",
            component: () => {
                if (!Vencord.Plugins.plugins.CustomAppIcons.started) return <Forms.FormText>
                    Enable CustomAppIcons and restart your client to add your own app icons.
                </Forms.FormText>;
                return (
                    <>
                        <Button color={ButtonLooks.OUTLINED}>!</Button>
                    </>
                );
            }
        }
    },

    start() {

    },

    stop() {

    }
});
