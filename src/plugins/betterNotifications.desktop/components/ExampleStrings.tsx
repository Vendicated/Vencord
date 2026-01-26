/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, TextInput } from "@webpack/common";

export default function ExampleString(props: { setValue: (value: string) => void, defaultValue: string, staticValue: string; }) {
    const [value, setValue] = React.useState<string>(props.defaultValue);
    const [exampleString, setExampleString] = React.useState<string>(props.staticValue);

    React.useEffect(() => {
        setExampleString(`${value}${props.staticValue}`);
        props.setValue(value);
    }, [value]);

    return <>
        <TextInput style={{ width: "6ch", textAlign: "center" }} onChange={setValue} value={value} />
        <TextInput style={{ marginTop: "6px", opacity: 0.5 }} value={exampleString} disabled={true}></TextInput>
    </>;
}
