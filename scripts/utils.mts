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

export interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}
export function promiseWithResolvers<T>(): PromiseWithResolvers<T> {
    let resolve: any, reject: any;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

export function getPluginTarget(filePath: string): string | undefined {
    const pathParts = filePath.split(/[/\\]/);
    if (/^index\.tsx?$/.test(pathParts.at(-1) ?? "")) pathParts.pop();

    const identifier = (pathParts.at(-1) ?? "").replace(/\.tsx?$/, "");
    const identiferBits = identifier.split(".");
    return identiferBits.length === 1 ? undefined : identiferBits.at(-1);
}
