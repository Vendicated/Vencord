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

import { useAwaiter } from "@utils/misc";

import { LinkedList } from "../utils/data";

const stores: Record<string, Store> = {};

type Store<T = any> = {
    keys: LinkedList<string>,
    values: Record<string, T>,
};

interface CachedAwaiterOptions {
    cacheKey: string;
    storeKey: string;
    cacheSize?: number;
}
export function useCachedAwaiter<T>(factory: () => Promise<T>, { cacheKey, storeKey, cacheSize = 25 }: CachedAwaiterOptions) {
    const store: Store<T> = stores[storeKey] ??= { keys: new LinkedList(), values: {} };
    const cached = store.values[cacheKey] || null;

    const [value, error, pending] = useAwaiter(factory, {
        fallbackValue: null,
        deps: [cacheKey],
        skipFetch: !!cached,
    });

    if (value != null) {
        if (store.values[cacheKey] == null) {
            // Shift cache if full
            if (store.keys.length >= cacheSize)
                for (const key of store.keys.splice(0, store.keys.length - cacheSize - 1))
                    delete store[key];

            store.keys.push(cacheKey);
        }

        store.values[cacheKey] = value;
    }

    return [cached ?? value, error, pending && !cached] as const;
}
