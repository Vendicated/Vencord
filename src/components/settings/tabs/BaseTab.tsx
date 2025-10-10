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

import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Margins } from "@utils/margins";
import { onlyOnce } from "@utils/onlyOnce";
import { Text } from "@webpack/common";
import type { ComponentType, PropsWithChildren } from "react";

export function SettingsTab({ title, children }: PropsWithChildren<{ title: string; }>) {
    return (
        <section>
            <Text
                variant="heading-lg/semibold"
                tag="h2"
                className={Margins.bottom16}
            >
                {title}
            </Text>

            {children}
        </section>
    );
}

export const handleSettingsTabError = onlyOnce(handleComponentFailed);

export function wrapTab(component: ComponentType<any>, tab: string) {
    return ErrorBoundary.wrap(component, {
        message: `Failed to render the ${tab} tab. If this issue persists, try using the installer to reinstall!`,
        onError: handleSettingsTabError,
    });
}
