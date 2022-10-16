import { ISettingElementProps } from ".";
import { PluginSettingsString } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

export function SettingInputComponent(props: ISettingElementProps<PluginSettingsString>) {
    const { setting, pluginSettings, id } = props;
    const [state, setState] = React.useState<any>(pluginSettings[id] ?? setting.default ?? null);

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="text"
                value={state}
                onChange={onChange}
                placeholder={setting.placeholder ?? "Enter a value"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}
