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

export default class Logger {
    constructor(public name: string, public color: string) { }

    private _log(level: "log" | "error" | "warn" | "info" | "debug", levelColor: string, args: any[]) {
        console[level](
            `%c Vencord %c %c ${this.name} `,
            `background: ${levelColor}; color: black; font-weight: bold; border-radius: 5px;`,
            "",
            `background: ${this.color}; color: black; font-weight: bold; border-radius: 5px;`
            , ...args
        );
    }

    public log(...args: any[]) {
        this._log("log", "#a6d189", args);
    }

    public info(...args: any[]) {
        this._log("info", "#a6d189", args);
    }

    public error(...args: any[]) {
        this._log("error", "#e78284", args);
    }

    public warn(...args: any[]) {
        this._log("warn", "#e5c890", args);
    }

    public debug(...args: any[]) {
        this._log("debug", "#eebebe", args);
    }
}
