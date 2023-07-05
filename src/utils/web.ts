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

export function chooseFile(mimeTypes: string) {
    return new Promise<File | null>(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = mimeTypes;
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return resolve(null);

            const reader = new FileReader();
            reader.onload = async () => {
                resolve(file);
            };
            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => document.body.removeChild(input));
    });
}
