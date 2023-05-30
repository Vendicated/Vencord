/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Button, Flex, Forms, React, Select, TextInput, useMemo, useState } from "@webpack/common";

import { Props } from "./types";

type Sound = [string, number];
type SoundCollection = Sound[];


const Input = ({
    initialValue,
    onChange,
    placeholder
}: {
    placeholder: string;
    initialValue: string;
    onChange?(value: string): void;
}) => {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange?.(value)}
            style={{ width: "150%" }}
        />
    );
};


export const SettingsComponent = ({ value, sounds, setValue, setError }: Props) => {
    const soundCollections = useMemo(() => {
        const collections: Record<string, SoundCollection> = {};
        const other: SoundCollection = [];

        for (const [name, id] of Object.entries(sounds)) {
            const group = name.split("_")[0].toLowerCase().replace("./", "");
            if (!name.includes("_")) other.push([name, id]);
            else {
                collections[group] ??= [];
                collections[group].push([name, id]);
            }
        }

        for (const group of Object.keys(collections)) {
            if (collections[group].length < 3) {
                other.push(...collections[group]);
                delete collections[group];
            }
        }

        return Object.entries({ ...collections, other });
    }, []);


    const sections = useMemo(() => {
        return soundCollections.map(([title, sounds]) => ({
            title,
            fields: sounds
                .map(([sound, id]) => {
                    const cs = value.find(cs => cs.fileName === sound);
                    if (!cs) return;

                    return { sound, id, value: cs.link };
                })
                .filter(Boolean) as NonNullable<{ sound: string, id: number, value: string; }[]>
        }));
    }, [value]);


    return <Forms.FormText>
        {
            sections
                .map(({ title, fields }, idx) => ({ title, fields, idx }))
                .sort((a, b) => b.fields.length - a.fields.length)
                .map(({ title, fields, idx }) => {
                    return <div style={{ marginBottom: "30px" }}>
                        <Forms.FormTitle>{title}</Forms.FormTitle>
                        {
                            !fields.length && (
                                <>{"Nothing here yet :^)"}</>
                            )
                        }

                        {
                            fields.map(({ sound, id, value }) => {
                                return <Flex flexDirection="row" style={{ justifyContent: "space-between" }}>
                                    <Select
                                        options={soundCollections[idx][1].map(([sound, _]) => ({
                                            label: sound
                                                .replace("./" + title, "")
                                                .replace("./", "") // The "other" section is a pseudo section.
                                                .replace(/_/g, " ")
                                                .replace(".mp3", "")
                                                .replace(/\w+/g, window._.capitalize),
                                            value: sound
                                        }))}
                                        isSelected={f => f === sound}
                                        serialize={f => f}
                                        select={f => { }}
                                    />
                                    <Input
                                        placeholder="Sound link"
                                        initialValue={value}
                                        onChange={link => { }}
                                    />
                                    <Button
                                        size={Button.Sizes.MIN}
                                        style={{
                                            background: "none",
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24">
                                            <title>Remove</title>
                                            <path fill="var(--status-danger)" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
                                            <path fill="var(--status-danger)" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z" />
                                        </svg>
                                    </Button>
                                </Flex>;
                            })
                        }
                    </div>;
                })
        }
    </Forms.FormText>;
};
