/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Forms, Select } from "@webpack/common";

export function WinMaterialSettings() {
    const settings = useSettings(["winMaterialStyle"]);

    return (
        <>
            <Forms.FormTitle tag="h5">Window vibrancy style (requires restart)</Forms.FormTitle>
            <ErrorBoundary noop>
                <Select
                    className={Margins.bottom20}
                    placeholder="Window material style"
                    options={[
                        {
                            label: "Default", value: undefined
                        },
                        {
                            label: "Mica",
                            value: "mica"
                        },
                        {
                            label: "Mica Alt",
                            value: "tabbed"
                        },
                        {
                            label: "Acrylic",
                            value: "acrylic"
                        },
                        {
                            label: "Auto",
                            value: "auto"
                        },
                        {
                            label: "None",
                            value: "none"
                        },
                    ]}
                    select={v => settings.winMaterialStyle = v}
                    isSelected={v => settings.winMaterialStyle === v}
                    serialize={identity}
                />
            </ErrorBoundary>
        </>
    );
}
