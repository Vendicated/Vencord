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

import { findStore } from "@webpack";
import { React } from "@webpack/common";

export const useStore = <T>(storeName: string, cb: (store: any) => T) => {
    const [store, setStore] = React.useState<any>();
    const [value, setValue] = React.useState<T>();
    const callback = React.useCallback(() => setValue(cb(store)), [storeName, cb]);

    React.useEffect(() => {
        setStore(findStore(storeName));
    }, [storeName]);

    React.useEffect(() => {
        if (!store) return;

        store.addChangeListener(callback);
        return () => store.removeChangeListener(callback);
    }, [store]);

    return value;
};
