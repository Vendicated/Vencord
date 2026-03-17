import { IMacConfig } from "./IMacConfig";
import { IWindowsConfig } from "./IWindowsConfig";
import { IX11Config } from "./IX11Config";
/** Key listener configuration */
export declare type IConfig = {
    /** The windows key server configuration */
    windows?: IWindowsConfig;
    /** The mac key server configuration */
    mac?: IMacConfig;
    /** The x11 key server configuration */
    x11?: IX11Config;
    /** The delay after which to dispose the listener server in case no listeners are registered. Defaults to 100, use -1 for no delay at all. */
    disposeDelay?: number;
};
//# sourceMappingURL=IConfig.d.ts.map