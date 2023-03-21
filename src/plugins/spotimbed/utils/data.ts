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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);


export type ListNode<T = any> = {
    value: T;
    next: ListNode<T> | null;
    prev: ListNode<T> | null;
};
export type ListHead<T = any> = ListNode<T> & {
    prev: null;
};
export type ListTail<T = any> = ListNode<T> & {
    next: null;
};

export class LinkedList<T = any> {
    constructor();
    constructor(head: ListHead<T> | null, tail: ListTail<T> | null, size: number);
    constructor(
        private head: ListHead<T> | null = null,
        private tail: ListTail<T> | null = null,
        private size: number = 0,
    ) { }

    get length() { return this.size; }

    static from<T = any>(arrayLike: ArrayLike<T>): LinkedList<T> {
        const array = arrayLike instanceof Array ? arrayLike : Array.from(arrayLike);
        const list = new LinkedList<T>();
        if (array.length === 0) return list;

        let node: ListTail<T> = list.head = {
            value: array[0],
            next: null,
            prev: null,
        };
        array.forEach((value, i) => {
            if (i === 0) return;
            // @ts-expect-error: node can be given a tail as it will be overwritten immediately after
            node = node.next = { value, prev: node, next: null };
        });
        list.tail = node;
        list.size = array.length;

        return list;
    }
    static concat<T = any>(...lists: LinkedList<T>[]): LinkedList<T> {
        lists = lists.filter(list => list.size > 0);
        if (lists.length === 0) return new LinkedList<T>();
        if (lists.length === 1) lists[0];

        const list = new LinkedList<T>(
            lists[0]?.head,
            lists[lists.length - 1]?.tail,
            lists.reduce((acc, list) => acc + list.size, 0),
        );

        for (let i = 1; i < lists.length; i++) {
            const [left, right] = [lists[i - 1], lists[i]];
            // @ts-expect-error: the given lists will be emptied afterwards, so this violation wont matter
            // non-null: empty lists are removed at the start of this method
            left.tail!.next = right.head;
            // @ts-expect-error: the given lists will be emptied afterwards, so this violation wont matter
            // non-null: empty lists are removed at the start of this method
            right.head!.prev = left.tail;
        }

        // Invalidate lists
        for (const list of lists) {
            list.head = list.tail = null;
            list.size = 0;
        }

        return list;
    }

    private *nodes(reverse: boolean = false): Generator<ListNode<T>> {
        let node: ListNode<T> | null = reverse ? this.tail : this.head;

        while (node) {
            yield node;
            node = reverse ? node.prev : node.next;
        }
    }
    private getNode(index: number): ListNode<T> | null {
        const absIndex = index < 0 ? this.size + index : index;
        if (absIndex < 0) return null;
        return this.nodeSlice(index, absIndex + 1)[0] ?? null;
    }
    private nodeSlice(start: number, end: number = this.size, fixed = false): ListNode<T>[] {
        if (this.size === 0) return [];
        start = Math.trunc(start);
        end = Math.trunc(end);

        const absStart = clamp((start < 0 && !fixed) ? this.size + start : start, 0, this.size);
        const absEnd = clamp((end < 0 && !fixed) ? this.size + end : end, 0, this.size);
        if (absStart >= absEnd || absEnd <= 0) return [];

        const reverse = absStart > this.size - absEnd;

        const nodes: ListNode<T>[] = [];
        const iter = this.nodes(reverse);

        // Skip to slice boundary
        for (let i = 0; i < (reverse ? this.size - absEnd : absStart); i++) iter.next();

        for (const node of iter) {
            if (reverse) nodes.unshift(node);
            else nodes.push(node);

            if (nodes.length === absEnd - absStart) break;
        }

        if (fixed) {
            nodes.push(...Array(end - absEnd));
            nodes.unshift(...Array(absStart - start));
        }

        return nodes;
    }
    private nodeSplice(start: number, deleteCount: number, list?: LinkedList<T>): ListNode<T>[] {
        start = Math.trunc(start);
        deleteCount = Math.max(deleteCount, 0);
        const absStart = clamp(start < 0 ? this.size + start : start, 0, this.size);
        const sliceResult = this.nodeSlice(absStart - 1, absStart + deleteCount + 1, true);
        // sliceResult === [leftEdge, ...deletedNodes, rightEdge]

        const deletedNodes = sliceResult.slice(1, -1).filter(node => node);
        if (deletedNodes.length > 0) {
            deletedNodes[0].prev = null;
            deletedNodes[deletedNodes.length - 1].next = null;
        }

        // NOTE: leftEdge === rightEdge will never be true since the slice is fixed
        const leftEdge = (sliceResult[0] ?? null) as ListNode<T> | null;
        const rightEdge = (sliceResult[sliceResult.length - 1] ?? null) as ListNode<T> | null;

        const lists: LinkedList<T>[] = [];

        if (leftEdge)
            lists.push(new LinkedList<T>(this.head, Object.assign(leftEdge, { next: null }), absStart));
        if (list?.size)
            lists.push(list);
        if (rightEdge)
            lists.push(new LinkedList<T>(Object.assign(rightEdge, { prev: null }), this.tail, this.size - absStart - deletedNodes.length));

        if (lists.length === 0) Object.assign(this, { head: null, tail: null, size: 0 });
        else if (lists.length === 1) Object.assign(this, lists[0]);
        else Object.assign(this, LinkedList.concat(...lists));

        return deletedNodes;
    }

    *[Symbol.iterator](): Generator<T> {
        for (const node of this.nodes()) yield node.value;
    }

    at(index: number): T | undefined {
        const node = this.getNode(index);
        return node?.value;
    }
    slice(start: number, end: number = this.size): T[] {
        return this.nodeSlice(start, end).map(node => node.value);
    }

    push(item: T): number {
        const node: ListNode<T> = { value: item, prev: this.tail, next: null };

        // @ts-expect-error: node.prev will be null if size is 0
        if (this.size === 0) this.head = node;
        // @ts-expect-error: tail will be overwritten immediately after
        // non-null: size > 0 so tail must exist
        else this.tail!.next = node;

        this.tail = node as ListTail<T>;
        return ++this.size;
    }
    pop(): T | undefined {
        if (this.size === 0) return undefined;
        if (this.size === 1) {
            // non-null: size > 0 so head must exist
            const { value } = this.head!;
            this.head = this.tail = null;
            this.size = 0;
            return value;
        }

        // non-null: size > 0 so tail must exist, size > 1 so tail.prev should exist
        this.tail = Object.assign(this.tail!.prev!, { next: null });
        this.size--;
    }
    unshift(item: T): number {
        const node = { value: item, prev: null, next: this.head };

        // @ts-expect-error: node.next will be null if size is 0
        if (this.size === 0) this.tail = node;
        // @ts-expect-error: head will be overwritten immediately after
        // non-null: size > 0 so head must exist
        else this.head!.prev = node;

        this.head = node;
        return ++this.size;
    }
    shift(): T | undefined {
        if (this.size === 0) return undefined;
        if (this.size === 1) {
            // non-null: size > 0 so head must exist
            const { value } = this.head!;
            this.head = this.tail = null;
            this.size = 0;
            return value;
        }

        // non-null: size > 0 so head must exist, size > 1 so head.next should exist
        this.head = Object.assign(this.head!.next!, { prev: null });
        this.size--;
    }
    splice(start: number, deleteCount: number, ...items: T[]): T[] {
        const deletedNodes = this.nodeSplice(start, deleteCount, items.length === 0 ? void 0 : LinkedList.from(items));
        return deletedNodes.map(node => node.value);
    }
}
