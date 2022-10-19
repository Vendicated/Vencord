import { ISettingElementProps } from ".";
import { PluginOptionString } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

export function SettingInputComponent({ option, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginOptionString>) {
    const [state, setState] = React.useState(pluginSettings[id] ?? option.default ?? null);
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
        <Forms.FormSection>
            <Forms.FormTitle>{option.description}</Forms.FormTitle>
            <TextInput
                type="text"
                value={state}
                onChange={handleChange}
                placeholder={option.placeholder ?? "Enter a value"}
                disabled={option.disabled?.() ?? false}
                {...option.componentProps}
            />
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
