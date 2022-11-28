/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Sofia Lima
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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "NoUnblockToJump",
    description: "Allows you to jump to messages of blocked users without unblocking them",
    authors: [Devs.dzshn],
    patches: [
        {
            find: '.id,"Search Results"',
            replacement: {
                match: /if\(.{1,10}\)(.{1,10}\.show\({.{1,50}UNBLOCK_TO_JUMP_TITLE)/,
                replace: "if(false)$1"
            }
        },
        {
            find: "renderJumpButton=function()",
            replacement: {
                match: /if\(.{1,10}\)(.{1,10}\.show\({.{1,50}UNBLOCK_TO_JUMP_TITLE)/,
                replace: "if(false)$1"
            }
        },
        {
            find: "flash:!0,returnMessageId",
            replacement: {
                match: /.\?(.{1,10}\.show\({.{1,50}UNBLOCK_TO_JUMP_TITLE)/,
                replace: "false?$1"
            }
        }
    ]
});
