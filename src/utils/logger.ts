export default class Logger {
    constructor(public name: string, public color: string) { }

    private _log(level: "log" | "error" | "warn" | "info" | "debug", levelColor: string, args: any[]) {
        console[level](
            `%c Bencord %c %c ${this.name} `,
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
