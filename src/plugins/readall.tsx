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

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { Button, React } from "../webpack/common";
import { addElementInServerList, removeElementInServerList } from "./apiServerList";

namespace Indicator {

    function sayHello() {
        console.log("Bruh!");
    }

    export const Element = () => {
        return <Button
            onClick={sayHello}
            size={Button.Sizes.MIN}
            style={{ marginTop: "4px", marginBottom: "4px", marginLeft: "9px" }}
        > Read all </Button>;
    };

}

export default definePlugin({
    name: "ReadAll",

    authors: [Devs.kemo],

    description: "Read all notifications",

    dependencies: ["ServerListAPI"],

    patches: [
        {
            find: ".Messages.MARK_GUILD_AS_READ",
            replacement: {
                match: /(.{6}INBOX_CHANNEL_ACKED,\{channel_id.{99}).{1}/,
                replace: "$&;Vencord.Plugins.plugins?.ReadAll?.Init($1)"
            }
        }
    ],

    // id:"mark-channel-read",
    // return\(.{7}\)\(.{4},\{id:"mark-channel-read",label:.{4}Messages.MARK_AS_READ
    Init(arg1: any, arg2: any) {
        console.log("Arg1", arg1);
        console.log("Arg2", arg2);
    },

    renderIndicator: () => {
        return <Indicator.Element />;
    },

    start() {
        addElementInServerList(this.renderIndicator);
    },

    stop() {
        removeElementInServerList(this.renderIndicator);
    }
});
