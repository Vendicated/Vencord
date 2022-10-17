import { ISettingElementProps } from ".";
import { PluginOptionSelect } from "../../../utils/types";
import { Forms, React, Select } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

export function SettingSelectComponent({ option, pluginSettings, onChange, onError, id }: ISettingElementProps<PluginOptionSelect>) {
    const def = pluginSettings[id] ?? option.options?.find(o => o.default)?.value;

    const [state, setState] = React.useState<any>(def ?? null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        let isValid = (option.isValid && option.isValid(newValue)) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setState(newValue);
            onChange(newValue);
        }
    }

    return (
        <FormSection>
            <FormTitle>{option.description}</FormTitle>
            <Select
                isDisabled={option.disabled?.() ?? false}
                options={option.options}
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
