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

import { LazyComponent } from "@utils/misc";

// eslint-disable-next-line path-alias/no-relative
import { FilterFn, waitFor } from "../webpack";

function throwNotFound(name: string): never {
    throw new Error(`Could not find ${name}`);
}

export function makeWaitForComponent<T extends React.ComponentType = React.ComponentType<any>>(name: string, filter: FilterFn | string | string[]): T {
    let myValue: T;
    waitFor(filter, (v: any) => myValue = v);

    return LazyComponent(() => myValue ?? throwNotFound(name)) as T;
}
