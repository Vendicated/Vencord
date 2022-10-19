import { ISettingElementProps } from ".";
import { PluginOptionSlider } from "../../../utils/types";
import { Forms, React, Slider } from "../../../webpack/common";

export function makeRange(start: number, end: number, step = 1) {
    let ranges: number[] = [];
    for (let value = start; value <= end; value += step) {
        ranges.push(Math.round(value * 100) / 100);
    }
    return ranges;
}

export function SettingSliderComponent({ option, pluginSettings, id, onChange, onError }: ISettingElementProps<PluginOptionSlider>) {
    const def = pluginSettings[id] ?? option.default;

    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue: number): void {
        let isValid = (option.isValid && option.isValid(newValue)) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            onChange(newValue);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{option.description}</Forms.FormTitle>
            <Slider
                disabled={option.disabled?.() ?? false}
                markers={option.markers}
                minValue={option.markers[0]}
                maxValue={option.markers[option.markers.length - 1]}
                initialValue={def}
                onValueChange={handleChange}
                onValueRender={(v: number) => String(v.toFixed(2))}
                stickToMarkers={option.stickToMarkers ?? true}
                {...option.componentProps}
            />
        </Forms.FormSection>
    );
}

