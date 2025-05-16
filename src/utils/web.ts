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

/**
 * Prompts the user to save a file to their system
 * @param file The file to save
 */
export function saveFile(file: File) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;

    document.body.appendChild(a);
    a.click();
    setImmediate(() => {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    });
}

/**
 * Prompts the user to choose a file from their system
 * @param mimeTypes A comma separated list of mime types to accept, see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept#unique_file_type_specifiers
 * @returns A promise that resolves to the chosen file or null if the user cancels
 */
export function chooseFile(mimeTypes: string) {
    return new Promise<File | null>(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = mimeTypes;
        input.onchange = async () => {
            resolve(input.files?.[0] ?? null);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => document.body.removeChild(input));
    });
}
