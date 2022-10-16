import { ISettingElementProps } from ".";
import { PluginSettingsBoolean } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

export function SettingBooleanComponent(props: ISettingElementProps<PluginSettingsBoolean>) {
    const { setting, pluginSettings, id } = props;
    const def = pluginSettings[id] ?? setting.default;
    const [state, setState] = React.useState<any>(def ?? false);

    const options = [
        { label: "Enabled", value: true, default: def === true },
        { label: "Disabled", value: false, default: typeof def === "undefined" || def === false },
    ];

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <Select
                isDisabled={setting.disabled?.() ?? false}
                options={options}
                placeholder={setting.placeholder ?? "Select an option"}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={onChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...setting.componentProps}
            />
        </FormSection>
    );
}

