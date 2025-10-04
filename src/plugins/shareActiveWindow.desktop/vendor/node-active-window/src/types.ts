/* eslint-disable */

export interface NativeWindowInfo {
    title: string;
    application: string;
    path: string;
    pid: number;
    icon: string;
    'windows.isUWPApp'?: boolean;
    'windows.uwpPackage'?: string;
}

export interface WindowInfo {
    title: string;
    application: string;
    path: string;
    pid: number;
    icon: string;
    windows?: {
        isUWPApp: boolean;
        uwpPackage: string;
    };
}

export interface Module<T> {
    getActiveWindow(): T;
    subscribe(callback: (windowInfo: T | null) => void): number;
    unsubscribe(watchId: number): void;
    initialize?(): void;
    requestPermissions?(): boolean;
    runLoop?(): void;
}

export interface InitializeOptions {
    osxRunLoop?: false | 'get' | 'all';
}

export interface IActiveWindow extends Omit<Module<WindowInfo>, 'runLoop'> {
    initialize(opts?: InitializeOptions): void;
    requestPermissions(): boolean;
}
