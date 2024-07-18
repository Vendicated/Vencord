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

import { Select, useEffect, useState } from "@webpack/common";
import React from "react";

import { MediaEngineStore, types } from "../../philsPluginLibrary";
import { screenshareStore } from "../stores";

export const AudioSourceSelect = (props?: typeof Select["defaultProps"]) => {
    const { use } = screenshareStore;

    const { audioSource, setAudioSource } = use();

    const [windowPreviews, setWindowPreviews] = useState<types.WindowPreview[]>([]);

    useEffect(() => {
        const intervalFn = async () => {
            const newPreviews = await MediaEngineStore.getMediaEngine().getWindowPreviews(1, 1);
            setWindowPreviews(oldPreviews => [...oldPreviews, ...newPreviews].filter((preview, index, array) => array.findIndex(t => t.id === preview.id) === index));
        };
        intervalFn();

        const intervals = [
            setInterval(async () => {
                intervalFn();
            }, 4000), setInterval(async () => {
                setWindowPreviews(await MediaEngineStore.getMediaEngine().getWindowPreviews(1, 1));
            }, 30000)
        ];

        return () => intervals.forEach(interval => clearInterval(interval));
    }, []);

    return (
        <Select
            options={windowPreviews.map(({ name, id }) => ({
                label: name,
                value: id
            }))}
            isSelected={value => audioSource === value}
            select={value => setAudioSource(value)}
            serialize={() => ""}
            {...props}
        ></Select>
    );
};
