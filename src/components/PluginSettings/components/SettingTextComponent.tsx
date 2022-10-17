import { ISettingElementProps } from ".";
import { PluginSettingsString } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

export function SettingInputComponent({ setting, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginSettingsString>) {
    const [state, setState] = React.useState(pluginSettings[id] ?? setting.default ?? null);
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
            <TextInput
                type="text"
                value={state}
                onChange={handleChange}
                placeholder={setting.placeholder ?? "Enter a value"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
            {error && <FormText style={{ color: "var(--text-danger)" }}>{error}</FormText>}
        </FormSection>
    );
}
