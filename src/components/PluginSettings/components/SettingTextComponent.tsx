import { ISettingElementProps } from ".";
import { PluginSettingsString } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

export function SettingInputComponent({ setting, pluginSettings, id, onChange }: ISettingElementProps<PluginSettingsString>) {
    const [state, setState] = React.useState(pluginSettings[id] ?? setting.default ?? null);

    function handleChange(newValue) {
        setState(newValue);
        onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="text"
                value={state}
                onChange={handleChange}
                placeholder={setting.placeholder ?? "Enter a value"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}
