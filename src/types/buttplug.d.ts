// Minimal ambient declarations for the `buttplug` package and its project aliases.
// Extend these types with more accurate definitions if you need stricter typing.

declare module "buttplug" {
    export class ButtplugClient {
        public connected: boolean;
        public devices: ButtplugClientDevice[];
        constructor(name?: string);
        connect(connector: any): Promise<void>;
        disconnect(): Promise<void>;
        startScanning(): Promise<void>;
        stopScanning(): Promise<void>;
        addListener(event: string, listener: (...args: any[]) => void): void;
    }

    export class ButtplugBrowserWebsocketClientConnector {
        constructor(url: string);
    }

    export class ButtplugClientDevice {
        public name: string;
        public index: number;
        public hasBattery: boolean;
        public vibrateAttributes: any[];
        vibrate(speed: number): Promise<void>;
        stop(): Promise<void>;
        battery(): Promise<number>;
    }

    export class ButtplugDeviceError extends Error {}

    // Placeholder for other message types used by the library
    export interface ButtplugMessage { }

    export {};
}

// Project-specific aliases used by the repo. Re-export everything from the real module.
declare module "@api/Buttplug" {
    export * from "buttplug";
}

declare module "@api/buttplug" {
    export * from "buttplug";
}
