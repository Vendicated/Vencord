/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

if (IS_DEV || IS_REPORTER) {
    var traces = {} as Record<string, [number, any[]]>;
    var logger = new Logger("Tracer", "#FFD166");
}

export const beginTrace = !(IS_DEV || IS_REPORTER) ? () => { } :
    function beginTrace(name: string, ...args: any[]) {
        if (name in traces) {
            throw new Error(`Trace ${name} already exists!`);
        }

        traces[name] = [performance.now(), args];
    };

export const finishTrace = !(IS_DEV || IS_REPORTER) ? () => 0 :
    function finishTrace(name: string) {
        const end = performance.now();

        const [start, args] = traces[name];
        delete traces[name];

        const totalTime = end - start;
        logger.debug(`${name} took ${totalTime}ms`, args);

        return totalTime;
    };

type Func = (...args: any[]) => any;
type TraceNameMapper<F extends Func> = (...args: Parameters<F>) => string;

function noopTracerWithResults<F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>) {
    return function (this: unknown, ...args: Parameters<F>): [ReturnType<F>, number] {
        return [f.apply(this, args), 0];
    };
}

function noopTracer<F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>) {
    return f;
}

export const traceFunctionWithResults = !(IS_DEV || IS_REPORTER)
    ? noopTracerWithResults
    : function traceFunctionWithResults<F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>): (this: unknown, ...args: Parameters<F>) => [ReturnType<F>, number] {
        return function (this: unknown, ...args: Parameters<F>) {
            const traceName = mapper?.(...args) ?? name;

            beginTrace(traceName, ...arguments);
            try {
                return [f.apply(this, args), finishTrace(traceName)];
            } catch (e) {
                finishTrace(traceName);
                throw e;
            }
        };
    };

export const traceFunction = !(IS_DEV || IS_REPORTER)
    ? noopTracer
    : function traceFunction<F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>): F {
        return function (this: unknown, ...args: Parameters<F>) {
            const traceName = mapper?.(...args) ?? name;

            beginTrace(traceName, ...arguments);
            try {
                return f.apply(this, args);
            } finally {
                finishTrace(traceName);
            }
        } as F;
    };
