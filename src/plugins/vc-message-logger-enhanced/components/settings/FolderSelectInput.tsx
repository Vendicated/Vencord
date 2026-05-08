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

import { classNameFactory } from "@api/Styles";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { copyWithToast } from "@utils/discord";
import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { Toasts } from "@webpack/common";

import { Native, settings } from "../..";
import { DEFAULT_IMAGE_CACHE_DIR } from "../../utils/constants";

const cl = classNameFactory("folder-upload");
const inputClasses = findCssClassesLazy("input", "inputWrapper", "editable") as Record<string, string>;

function createDirSelector(settingKey: "logsDir" | "imageCacheDir", successMessage: string) {
    return function DirSelector({ option }) {
        if (IS_WEB) return null;

        return (
            <section>
                <Heading tag="h5">{option.description}</Heading>
                <SelectFolderInput
                    settingsKey={settingKey}
                    successMessage={successMessage}
                />
            </section>
        );
    };
}

export const ImageCacheDir = createDirSelector("imageCacheDir", "Successfully updated Image Cache Dir");
export const LogsDir = createDirSelector("logsDir", "Successfully updated Logs Dir");

interface Props {
    settingsKey: "imageCacheDir" | "logsDir",
    successMessage: string,
}

export function SelectFolderInput({ settingsKey, successMessage }: Props) {
    const path = settings.store[settingsKey];

    function getDirName(path: string) {
        const parts = path.split("\\").length > 1 ? path.split("\\") : path.split("/");

        return parts.slice(parts.length - 2, parts.length).join("\\");
    }

    async function onFolderSelect() {
        try {
            const res = await Native.chooseDir(settingsKey);
            settings.store[settingsKey] = res;

            return Toasts.show({
                id: Toasts.genId(),
                type: Toasts.Type.SUCCESS,
                message: successMessage
            });
        } catch (err) {
            Toasts.show({
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
                message: "Failed to update directory"
            });
        }
    }

    return (
        <div className={classes(cl("-container"), inputClasses.input)}>
            <div onClick={() => copyWithToast(path)} className={cl("-input")}>
                {path == null || path === DEFAULT_IMAGE_CACHE_DIR ? "Choose Folder" : getDirName(path)}
            </div>
            <Button
                className={cl("-button")}
                size="small"
                onClick={onFolderSelect}
            >
                Browse
            </Button>
        </div>
    );

}
