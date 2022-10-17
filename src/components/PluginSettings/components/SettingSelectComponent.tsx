import { ISettingElementProps } from ".";
import { PluginSettingsSelect } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

export function SettingSelectComponent({ setting, pluginSettings, onChange, onError, id }: ISettingElementProps<PluginSettingsSelect>) {
    const def = pluginSettings[id] ?? setting.options?.find(o => o.default)?.value;

    const [state, setState] = React.useState<any>(def ?? null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        let isValid = (setting.isValid && setting.isValid(newValue)) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setState(newValue);
            onChange(newValue);
        }
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
                select={handleChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...setting.componentProps}
            />
            {error && <FormText style={{ color: "var(--text-danger)" }}>{error}</FormText>}
        </FormSection>
    );
}
