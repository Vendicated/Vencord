/* eslint-disable */

import { loadAddon } from "./addon-loader";
import type {
    Module,
    NativeWindowInfo,
    WindowInfo,
    IActiveWindow,
    InitializeOptions
} from './types';

const addon: Module<NativeWindowInfo> = loadAddon();

class ActiveWindowClass implements IActiveWindow {
    private options: InitializeOptions = {};

    private encodeWindowInfo(info: NativeWindowInfo): WindowInfo {
        return {
            title: info.title,
            application: info.application,
            path: info.path,
            pid: info.pid,
            icon: info.icon,
            ...(process.platform == 'win32'
                ? {
                    windows: {
                        isUWPApp: info['windows.isUWPApp'] || false,
                        uwpPackage: info['windows.uwpPackage'] || ''
                    }
                }
                : {})
        };
    }

    public initialize(options: InitializeOptions = {}): void {
        this.options = options;

        if (!addon) {
            throw new Error('Failed to load native addon');
        }

        if (addon.initialize) {
            addon.initialize();
        }

        // set up runloop on MacOS
        if (process.platform == 'darwin' && this.options.osxRunLoop == 'all') {
            const interval = setInterval(() => {
                if (addon && addon.runLoop) {
                    addon.runLoop();
                } else {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    public requestPermissions(): boolean {
        if (!addon) {
            throw new Error('Failed to load native addon');
        }

        if (addon.requestPermissions) {
            return addon.requestPermissions();
        }

        return true;
    }

    public getActiveWindow(): WindowInfo {
        if (!addon) {
            throw new Error('Failed to load native addon');
        }

        // use runloop on MacOS if requested
        if (
            process.platform == 'darwin' &&
            this.options.osxRunLoop &&
            addon.runLoop
        ) {
            addon.runLoop();
        }

        const info = addon.getActiveWindow();

        return this.encodeWindowInfo(info);
    }

    public subscribe(
        callback: (windowInfo: WindowInfo | null) => void
    ): number {
        if (!addon) {
            throw new Error('Failed to load native addon');
        }

        const watchId = addon.subscribe(nativeWindowInfo => {
            callback(
                !nativeWindowInfo
                    ? null
                    : this.encodeWindowInfo(nativeWindowInfo)
            );
        });

        return watchId;
    }

    public unsubscribe(watchId: number): void {
        if (!addon) {
            throw new Error('Failed to load native addon');
        }

        if (watchId < 0) {
            throw new Error('Watch ID must be a positive number');
        }

        addon.unsubscribe(watchId);
    }
}

const ActiveWindow = new ActiveWindowClass();

export * from './types';
export { ActiveWindow };
export default ActiveWindow;
