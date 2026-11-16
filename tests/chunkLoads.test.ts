/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@tests/setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canonicalizeMatch } from "@utils/patches";
import {
    DefaultExtractAndLoadChunksRegex,
    findAllChunkLoads,
    parseChunkIds
} from "@webpack/chunkLoads";

describe("parseChunkIds", () => {
    it("parses quoted and bare ids in order", () => {
        assert.deepEqual(
            parseChunkIds('a.e("123"),a.e(456),a.e("abc"),a.e(789)'),
            ["123", 456, "abc", 789]
        );
    });
});

describe("findFirstChunkLoad", () => {
    it("captures chunk ids and entry point from a Promise.all load", () => {
        const factory = 'function(){return Promise.all([a.e("123"),a.e(456)]).then(a.bind(a,"entry"))}';
        const match = factory.match(canonicalizeMatch(DefaultExtractAndLoadChunksRegex));

        assert.ok(match);
        assert.equal(match[1], 'a.e("123"),a.e(456)');
        assert.equal(match[2], "entry");
    });

    it("captures a Promise.resolve load with no chunk ids", () => {
        const factory = 'function(){return Promise.resolve().then(a.bind(a,"entry"))}';
        const match = factory.match(canonicalizeMatch(DefaultExtractAndLoadChunksRegex));

        assert.ok(match);
        assert.equal(match[2], "entry");
    });
});

describe("findAllChunkLoads", () => {
    it("finds grouped and lone loads in source order", () => {
        const factory = `function(){
            return Promise.all([a.e("123"),a.e(456)]).then(a.bind(a,"entry1")),
                   a.e("789").then(a.bind(a,"entry2"));
        }`;
        const matches = findAllChunkLoads(factory, false);

        assert.equal(matches.length, 2);
        assert.equal(matches[0][1], 'a.e("123"),a.e(456)');
        assert.equal(matches[0][2], "entry1");
        assert.equal(matches[1][1], 'a.e("789")');
        assert.equal(matches[1][2], "entry2");
        assert.ok(matches[0].index! < matches[1].index!);
    });

    it("only matches the complete .then shape when complete is true", () => {
        const factory = 'function(){return Promise.all([a.e("123")]).then(a.b.bind(a,"entry",extra))}';

        assert.equal(findAllChunkLoads(factory, false).length, 0);
        const matches = findAllChunkLoads(factory, true);
        assert.equal(matches.length, 1);
        assert.equal(matches[0][2], "entry");
    });
});
