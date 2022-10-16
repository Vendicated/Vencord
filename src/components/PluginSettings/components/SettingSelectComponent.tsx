import { ISettingElementProps } from ".";
import { PluginSettingsSelect } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle } = Forms;

export function SettingSelectComponent(props: ISettingElementProps<PluginSettingsSelect>) {
    const { setting, pluginSettings, id } = props;
    const def = pluginSettings[id] ?? setting.options?.find(o => o.default)?.value;
    const [state, setState] = React.useState<any>(def ?? null);

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <Select
                isDisabled={setting.disabled?.() ?? false}
                options={setting.options}
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
