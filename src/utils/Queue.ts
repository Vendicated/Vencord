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

import { Promisable } from "type-fest";

export class Queue {
    /**
     * @param maxSize The maximum amount of functions that can be queued at once.
     *              If the queue is full, the oldest function will be removed.
     */
    constructor(public maxSize = Infinity) { }

    queue = [] as Array<() => Promisable<unknown>>;

    private promise?: Promise<any>;

    private next() {
        const func = this.queue.shift();
        if (func)
            this.promise = Promise.resolve()
                .then(func)
                .then(() => this.next());
        else
            this.promise = undefined;
    }

    private run() {
        if (!this.promise)
            this.next();
    }

    push<T>(func: () => Promisable<T>) {
        if (this.size >= this.maxSize)
            this.queue.shift();

        this.queue.push(func);
        this.run();
    }

    unshift<T>(func: () => Promisable<T>) {
        if (this.size >= this.maxSize)
            this.queue.pop();

        this.queue.unshift(func);
        this.run();
    }

    get size() {
        return this.queue.length;
    }
}
