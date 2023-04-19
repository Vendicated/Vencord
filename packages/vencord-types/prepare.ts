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

import { cpSync, rmSync } from "fs";
import { join } from "path";

for (const file of ["preload.d.ts", "userplugins", "main", "debug"]) {
    rmSync(join(__dirname, "dist", file), { recursive: true, force: true });
}

for (const file of ["globals.d.ts", "modules.d.ts"]) {
    cpSync(
        join(__dirname, "..", "..", "src", file),
        join(__dirname, "dist", file)
    );
}
