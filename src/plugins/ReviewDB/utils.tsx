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

import { classNameFactory } from "@api/Styles";
import { UserStore } from "@webpack/common";

import { Auth } from "./auth";
import { Review, UserType } from "./entities";

export const cl = classNameFactory("vc-rdb-");

export function canDeleteReview(review: Review) {
    const myId = UserStore.getCurrentUser().id;
    return (
        review.sender.discordID === myId
        || Auth.user?.type === UserType.Admin
    );
}
