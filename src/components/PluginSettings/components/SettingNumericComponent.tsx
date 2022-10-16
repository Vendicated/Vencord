import { ISettingElementProps } from ".";
import { PluginSettingsNumber } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

export function SettingNumericComponent(props: ISettingElementProps<PluginSettingsNumber>) {
    const { setting, pluginSettings, id } = props;
    const [state, setState] = React.useState<any>(pluginSettings[id] ?? BigInt(setting.default ?? 0));

    function onChange(newValue) {
        setState(newValue);
        props.onChange(BigInt(newValue));
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="number"
                pattern="[0-9]+"
                value={state}
                onChange={onChange}
                placeholder={setting.placeholder ?? "Enter a number"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}
