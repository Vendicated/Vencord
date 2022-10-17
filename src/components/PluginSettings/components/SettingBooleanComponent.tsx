import { ISettingElementProps } from ".";
import { PluginOptionBoolean } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

export function SettingBooleanComponent({ option, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginOptionBoolean>) {
    const def = pluginSettings[id] ?? option.default;

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
        let isValid = (option.isValid && option.isValid(newValue)) ?? true;
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
            <FormTitle>{option.name}</FormTitle>
            <Select
                isDisabled={option.disabled?.() ?? false}
                options={options}
                placeholder={option.placeholder ?? "Select an option"}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={handleChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...option.componentProps}
            />
            {error && <FormText style={{ color: "var(--text-danger)" }}>{error}</FormText>}
        </FormSection>
    );
}

