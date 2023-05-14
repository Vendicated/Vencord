/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { LazyComponent } from "@utils/react";
import { findByCode } from "@webpack";

export const SearchIcon = LazyComponent(() => findByCode("M21.707 20.293L16.314 14.9C17.403"));
export const CancelIcon = LazyComponent(() => findByCode("M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4"));
export const RecentlyUsedIcon = LazyComponent(() => findByCode("M12 2C6.4764 2 2 6.4764 2 12C2 17.5236 6.4764 22 12 22C17.5236"));
export const CogIcon = LazyComponent(() => findByCode("M19.738 10H22V14H19.739C19.498 14.931 19.1"));
