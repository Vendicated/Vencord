/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

if (IS_DEV) {
    var traces = {} as Record<string, [number, any[]]>;
    var logger = new Logger("Tracer", "#FFD166");
}

const noop = function () { };

export const beginTrace = !IS_DEV ? noop :
    function beginTrace(name: string, ...args: any[]) {
        if (name in traces)
            throw new Error(`Trace ${name} already exists!`);

        traces[name] = [performance.now(), args];
    };

export const finishTrace = !IS_DEV ? noop : function finishTrace(name: string) {
    const end = performance.now();

    const [start, args] = traces[name];
    delete traces[name];

    logger.debug(`${name} took ${end - start}ms`, args);
};

type Func = (...args: any[]) => any;
type TraceNameMapper<F extends Func> = (...args: Parameters<F>) => string;

const noopTracer =
    <F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>) => f;

export const traceFunction = !IS_DEV
    ? noopTracer
    : function traceFunction<F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>): F {
        return function (this: any, ...args: Parameters<F>) {
            const traceName = mapper?.(...args) ?? name;

            beginTrace(traceName, ...arguments);
            try {
                return f.apply(this, args);
            } finally {
                finishTrace(traceName);
            }
        } as F;
    };
