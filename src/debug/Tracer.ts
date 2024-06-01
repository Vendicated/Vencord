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

import { Logger } from "@utils/Logger";

if (IS_DEV || IS_REPORTER) {
    var traces = {} as Record<string, [number, any[]]>;
    var logger = new Logger("Tracer", "#FFD166");
}

const noop = function () { };

export const beginTrace = !(IS_DEV || IS_REPORTER) ? noop :
    function beginTrace(name: string, ...args: any[]) {
        if (name in traces)
            throw new Error(`Trace ${name} already exists!`);

        traces[name] = [performance.now(), args];
    };

export const finishTrace = !(IS_DEV || IS_REPORTER) ? noop : function finishTrace(name: string) {
    const end = performance.now();

    const [start, args] = traces[name];
    delete traces[name];

    logger.debug(`${name} took ${end - start}ms`, args);
};

type Func = (...args: any[]) => any;
type TraceNameMapper<F extends Func> = (...args: Parameters<F>) => string;

const noopTracer =
    <F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>) => f;

export const traceFunction = !(IS_DEV || IS_REPORTER)
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
