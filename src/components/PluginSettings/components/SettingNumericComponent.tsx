import { ISettingElementProps } from ".";
import { PluginSettingsNumber, PluginSettingType } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

const MAX_SAFE_NUMBER = BigInt(Number.MAX_SAFE_INTEGER);

export function SettingNumericComponent(props: ISettingElementProps<PluginSettingsNumber>) {
    const { setting, pluginSettings, id } = props;

    function serialize(value: any) {
        if (props.setting.type === PluginSettingType.BIGINT) return BigInt(value);
        return Number(value);
    }

    const [state, setState] = React.useState<any>(`${pluginSettings[id] ?? setting.default ?? 0}`);

    function onChange(newValue) {
        if (props.setting.type === PluginSettingType.NUMBER && BigInt(newValue) >= MAX_SAFE_NUMBER) {
            setState(`${Number.MAX_SAFE_INTEGER}`);
        } else {
            setState(newValue);
        }
        props.onChange(serialize(newValue));
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                value={state}
                onChange={onChange}
                placeholder={setting.placeholder ?? "Enter a number"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}
