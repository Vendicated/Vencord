/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@tests/setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type FindReplayAdapter,replayFinds } from "@debug/replayFinds";
import type { RecordedFind } from "@webpack";

function makeAdapter(overrides: Partial<FindReplayAdapter> = {}): FindReplayAdapter {
    return {
        find: () => ({ ok: true }),
        findByProps: () => ({ ok: true }),
        findByCode: () => ({ ok: true }),
        findCssClasses: () => ({ ok: true }),
        findStore: () => ({ ok: true }),
        findComponentByCode: () => ({ ok: true }),
        proxyLazyWebpack: () => ({ ok: true }),
        LazyComponentWebpack: () => ({ ok: true }),
        extractAndLoadChunks: async () => true,
        mapMangledModule: () => ({ a: 1, b: 2 }),
        ...overrides
    };
}

describe("replayFinds", () => {
    it("dispatches recorded calls by their canonical method", async () => {
        const calls: Array<[string, any[]]> = [];
        const adapter = makeAdapter({
            findByProps: (...args: any[]) => {
                calls.push(["findByProps", args]);
                return {};
            }
        });
        const history: RecordedFind[] = [["findByProps", ["foo", "bar"]]];

        assert.deepEqual(await replayFinds(history, adapter), []);
        assert.deepEqual(calls, [["findByProps", ["foo", "bar"]]]);
    });

    it("labels a failed find with the canonical method and its props", async () => {
        const filter = Object.assign(() => false, { $$vencordProps: ["foo", "bar"] });
        const history: RecordedFind[] = [["find", [filter]]];

        const failures = await replayFinds(history, makeAdapter({ find: () => null }));

        assert.equal(failures.length, 1);
        assert.equal(failures[0].label, 'find("foo", "bar")');
    });

    it("treats a false chunk load as a failure", async () => {
        const history: RecordedFind[] = [["extractAndLoadChunks", [["123"], /entry/]]];

        const failures = await replayFinds(history, makeAdapter({ extractAndLoadChunks: async () => false }));

        assert.equal(failures.length, 1);
        assert.ok(failures[0].label.startsWith("extractAndLoadChunks(["));
    });

    it("detects an incomplete mangled module mapping", async () => {
        const mapper = { a: () => true, b: () => true };
        const history: RecordedFind[] = [["mapMangledModule", ["code", mapper, false]]];

        const failures = await replayFinds(history, makeAdapter({ mapMangledModule: () => ({ a: 1 }) }));

        assert.equal(failures.length, 1);
        assert.ok(failures[0].label.includes("b:"));
    });

    it("calls a recorded lazy factory directly", async () => {
        let calls = 0;
        const history: RecordedFind[] = [["proxyLazyWebpack", [() => {
            calls++;
            return null;
        }]]];

        const failures = await replayFinds(history, makeAdapter());

        assert.equal(calls, 1);
        assert.equal(failures.length, 1);
    });
});
