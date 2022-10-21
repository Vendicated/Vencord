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

import { makeLazy } from "./misc";

const ProxyDummy = function () { };

/**
 * Wraps the result of {@see makeLazy} in a Proxy you can consume as if it wasn't lazy.
 * On first property access, the lazy is evaluated
 * @param factory lazy factory
 * @returns Proxy
 *
 * Note that the example below exists already as an api, see {@link lazyWebpack}
 * @example const mod = proxyLazy(() => findByProps("blah")); console.log(mod.blah);
 */
export function proxyLazy<T>(factory: () => T): T {
    const lazy = makeLazy(factory);

    return new Proxy(ProxyDummy, {
        get: (_, prop) => lazy()[prop],
        set: (_, prop, value) => lazy()[prop] = value,
        has: (_, prop) => prop in lazy(),
        apply: (_, $this, args) => (lazy() as Function).apply($this, args),
        ownKeys: () => Reflect.ownKeys(lazy() as object),
        construct: (_, args) => Reflect.construct(lazy() as Function, args),
        deleteProperty: (_, prop) => delete lazy()[prop],
        defineProperty: (_, property, attributes) => !!Object.defineProperty(lazy(), property, attributes),
        getPrototypeOf: () => Object.getPrototypeOf(lazy())
    }) as any as T;
}
