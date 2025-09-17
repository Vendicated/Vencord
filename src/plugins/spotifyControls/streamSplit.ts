/* eslint-disable simple-header/header */

/*
 * Cleaned up smaller version of split2 - <https://github.com/mcollina/split2>
 * Copyright (c) 2014-2018, Matteo Collina <hello@matteocollina.com>
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: ISC
 */

import { Transform } from "stream";
import { StringDecoder } from "string_decoder";

const newlineMatcher = /\r?\n/;

export function createStreamSplitter(maxLength = 1024 * 1024) {
    const decoder = new StringDecoder("utf8");
    let overflow = false;
    let last = "";

    return new Transform({
        autoDestroy: true,
        readableObjectMode: true,

        flush(cb) {
            last += decoder.end();

            if (last) {
                this.push(last);
            }

            cb();
        },

        transform(chunk, _encoding, cb) {
            let lines: string[];

            if (overflow) { // Line buffer is full. Skip to start of next line.
                const buf = decoder.write(chunk);
                lines = buf.split(newlineMatcher);

                if (lines.length === 1) return cb(); // Line ending not found. Discard entire chunk.

                // Line ending found. Discard trailing fragment of previous line and reset overflow
                lines.shift();
                overflow = false;
            } else {
                last += decoder.write(chunk);
                lines = last.split(newlineMatcher);
            }

            last = lines.pop() ?? "";

            for (const line of lines) {
                this.push(line);
            }

            overflow = last.length > maxLength;
            if (overflow) {
                cb(new Error("maximum buffer reached"));
                return;
            }

            cb();
        }
    });
}
