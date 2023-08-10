/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Promisable } from "type-fest";

/**
 * A queue that can be used to run tasks consecutively.
 * Highly recommended for things like fetching data from Discord
 */
export class Queue {
    /**
     * @param maxSize The maximum amount of functions that can be queued at once.
     *                If the queue is full, the oldest function will be removed.
     */
    constructor(public readonly maxSize = Infinity) { }

    private queue = [] as Array<() => Promisable<unknown>>;

    private promise?: Promise<any>;

    private next() {
        const func = this.queue.shift();
        if (func)
            this.promise = Promise.resolve()
                .then(func)
                .finally(() => this.next());
        else
            this.promise = undefined;
    }

    private run() {
        if (!this.promise)
            this.next();
    }

    /**
     * Append a task at the end of the queue. This task will be executed after all other tasks
     * If the queue exceeds the specified maxSize, the first task in queue will be removed.
     * @param func Task
     */
    push<T>(func: () => Promisable<T>) {
        if (this.size >= this.maxSize)
            this.queue.shift();

        this.queue.push(func);
        this.run();
    }

    /**
     * Prepend a task at the beginning of the queue. This task will be executed next
     * If the queue exceeds the specified maxSize, the last task in queue will be removed.
     * @param func Task
     */
    unshift<T>(func: () => Promisable<T>) {
        if (this.size >= this.maxSize)
            this.queue.pop();

        this.queue.unshift(func);
        this.run();
    }

    /**
     * The amount of tasks in the queue
     */
    get size() {
        return this.queue.length;
    }
}
