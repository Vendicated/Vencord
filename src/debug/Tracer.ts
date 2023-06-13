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

const IS_DEV = process.env.NODE_ENV === "development";

const traces: Record<string, [number, any[]]> = {};
const logger = IS_DEV ? new Logger("Tracer", "#FFD166") : null;

const noop = () => {};

export const beginTrace = IS_DEV
  ? (name: string, ...args: any[]) => {
      if (traces[name]) {
        throw new Error(`Trace ${name} already exists!`);
      }

      traces[name] = [performance.now(), args];
    }
  : noop;

export const finishTrace = IS_DEV
  ? (name: string) => {
      const end = performance.now();
      const [start, args] = traces[name];
      delete traces[name];

      logger.debug(`${name} took ${end - start}ms`, args);
    }
  : noop;

type Func = (...args: any[]) => any;
type TraceNameMapper<F extends Func> = (...args: Parameters<F>) => string;

const noopTracer = <F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>) => f;

export const traceFunction = IS_DEV
  ? <F extends Func>(name: string, f: F, mapper?: TraceNameMapper<F>): F => {
      return function (this: any, ...args: Parameters<F>) {
        const traceName = mapper?.(...args) ?? name;

        beginTrace(traceName, ...args);
        try {
          return f.apply(this, args);
        } finally {
          finishTrace(traceName);
        }
      } as F;
    }
  : noopTracer;
