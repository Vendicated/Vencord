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

import { Button } from "@webpack/common";

import { Heart } from "./Heart";

export default function DonateButton(props: any) {
    return (
        <Button
            {...props}
            look={Button.Looks.LINK}
            color={Button.Colors.TRANSPARENT}
            onClick={() => VencordNative.native.openExternal("https://github.com/sponsors/vendicated")}
        >
            <Heart />
            Donate
        </Button>
    );
}
