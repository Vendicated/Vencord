import { PluginOptionBase } from "../../../utils/types";

export interface ISettingElementProps<T extends PluginOptionBase> {
    option: T;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
    id: string;
    onError(hasError: boolean): void;
}

export * from "./SettingBooleanComponent";
export * from "./SettingNumericComponent";
export * from "./SettingSelectComponent";
export * from "./SettingTextComponent";
export * from "./SettingSliderComponent";
