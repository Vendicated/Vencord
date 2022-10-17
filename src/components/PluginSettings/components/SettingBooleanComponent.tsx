import { ISettingElementProps } from ".";
import { PluginSettingsBoolean } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

export function SettingBooleanComponent({ setting, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginSettingsBoolean>) {
    const def = pluginSettings[id] ?? setting.default;

    const [state, setState] = React.useState(def ?? false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    const options = [
        { label: "Enabled", value: true, default: def === true },
        { label: "Disabled", value: false, default: typeof def === "undefined" || def === false },
    ];

    function handleChange(newValue: boolean): void {
        let isValid = (setting.isValid && setting.isValid(newValue)) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            setState(newValue);
            onChange(newValue);
        }
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
                select={handleChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...setting.componentProps}
            />
            {error && <FormText style={{ color: "var(--text-danger)" }}>{error}</FormText>}
        </FormSection>
    );
}

