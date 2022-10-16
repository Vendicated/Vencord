import { PluginSettingsBase } from "../../../utils/types";

export interface ISettingElementProps<T extends PluginSettingsBase> {
    setting: T;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
    id: string;
}

export * from "./SettingBooleanComponent";
export * from "./SettingNumericComponent";
export * from "./SettingSelectComponent";
export * from "./SettingTextComponent";


