/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { PluginOptionArray } from "@utils/types";
import {
    Button,
    Flex,
    React,
    TextInput,
    useEffect,
    useState,
} from "@webpack/common";

import { SettingProps, SettingsSection } from "./Common";

export const ArraySetting = ErrorBoundary.wrap(function ArraySetting({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    id
}: SettingProps<PluginOptionArray>) {
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>([]);
    const [text, setText] = useState<string>("");

    const removeButton = (id: string) => {
        return (
            <Button
                size={Button.Sizes.MIN}
                onClick={() => removeItem(id)}
                style={{ background: "none", color: "red" }}
                look={Button.Looks.BLANK}
            >
                <DeleteIcon />
            </Button>
        );
    };

    const removeItem = (itemId: string) => {
        setItems(items.filter(item => item !== itemId));
    };

    useEffect(() => {
        if (text === "") {
            setError(null);
            return;
        }
        if (items.includes(text)) {
            setError("This item is already added");
            return;
        }
        const isValid = option.isValid?.call(definedSettings, text) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else setError(null);
    }, [text, items]);


    useEffect(() => {
        pluginSettings[id] = items;
        onChange(items);
    }, [items]);


    return (
        <SettingsSection name={id} description={option.description} error={error}>
            {items.map((item, index) => (
                    <Flex
                        flexDirection="row"
                        key={index}
                        style={{
                            gap: "1px",
                            marginBottom: "8px"
                        }}
                    >
                        <TextInput
                            value={item}
                            onChange={v => {
                                const idx = items.indexOf(item);
                                setItems(items.map((i, index) => index === idx ? v : i));
                            }}
                            placeholder="Enter Text"
                        />
                        {removeButton(item)}
                    </Flex>
                ))}
                <Flex
                    flexDirection="row"
                    style={{
                        gap: "3px"
                    }}
                >
                    <TextInput
                        type="text"
                        placeholder="Enter Text"
                        onChange={v => setText(v)}
                        value={text}
                    />
                    <Button
                        size={Button.Sizes.MIN}
                        onClick={() => {
                            setItems([...items, text]);
                            setText("");
                        }}
                        disabled={text === "" || error != null}
                        look={Button.Looks.BLANK}
                        style={{ color: "var(--interactive-normal)" }}
                    >
                        <PlusIcon />
                    </Button>
                </Flex>
        </SettingsSection>
    );
});
