import { ISettingElementProps } from ".";
import { PluginSettingsNumber, SettingType } from "../../../utils/types";
import { Forms, React, TextInput } from "../../../webpack/common";

const { FormSection, FormTitle, FormText } = Forms;

const MAX_SAFE_NUMBER = BigInt(Number.MAX_SAFE_INTEGER);

export function SettingNumericComponent({ setting, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginSettingsNumber>) {
    function serialize(value: any) {
        if (setting.type === SettingType.BIGINT) return BigInt(value);
        return Number(value);
    }

    const [state, setState] = React.useState<any>(`${pluginSettings[id] ?? setting.default ?? 0}`);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        let isValid = (setting.isValid && setting.isValid(newValue)) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else if (setting.type === SettingType.NUMBER && BigInt(newValue) >= MAX_SAFE_NUMBER) {
            setState(`${Number.MAX_SAFE_INTEGER}`);
            onChange(serialize(newValue));
        } else {
            setState(newValue);
            onChange(serialize(newValue));
        }
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                value={state}
                onChange={handleChange}
                placeholder={setting.placeholder ?? "Enter a number"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
            {error && <FormText style={{ color: "var(--text-danger)" }}>{error}</FormText>}
        </FormSection>
    );
}
