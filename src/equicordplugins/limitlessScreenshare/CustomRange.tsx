/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { lodash, Menu, useEffect, useMemo, useState } from "@webpack/common";

import { COOLDOWN_MS } from "./settings";
import { denormalize, normalize } from "./utils";

export type CustomRangeProps = {
    onChange: (value: number) => void,
    initialValue: number,
    minMax: [number, number],
    group: string,
    id: string,
    suffix: string;
};

type RangeSliderProps = Omit<CustomRangeProps, "group" | "id"> & {
    controlProps: any,
    sliderRef: any;
};

const RangeSlider = ({ onChange, initialValue, minMax, suffix, controlProps, sliderRef }: RangeSliderProps) => {
    const [value, setValue] = useState(initialValue);
    const [minValue, maxValue] = minMax;

    const changeStreamSettings = useMemo(() => lodash.throttle((value: number) => onChange(value), COOLDOWN_MS), []);
    useEffect(() => () => changeStreamSettings.cancel(), [changeStreamSettings]);

    const onChangeHandler = (newValue: number) => {
        const roundedValue = Math.round(denormalize(newValue, minValue, maxValue));
        setValue(roundedValue);
        changeStreamSettings(roundedValue);
    };
    return (
        <Menu.MenuSliderControl
            {...controlProps}
            ref={sliderRef}
            onChange={onChangeHandler}
            renderValue={() => value + suffix}
            value={normalize(value, minValue, maxValue) || 0}
            minValue={0}
            maxValue={100}>
        </Menu.MenuSliderControl>
    );
};

export const CustomRange = ({ group, id, ...props }: CustomRangeProps) => (
    <Menu.MenuControlItem group={`${group}`} id={`${id}-custom`} label={props.initialValue + props.suffix} control={(controlProps, ref) => <RangeSlider
        {...props}
        controlProps={controlProps}
        sliderRef={ref}
    />} />
);
