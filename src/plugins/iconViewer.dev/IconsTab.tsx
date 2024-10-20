/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./IconsTab.css";

import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { Clickable, Forms, React, TextInput } from "@webpack/common";

import { openIconModal } from "./IconModal";
import { Icons } from "./utils";


const searchMatch = (search: string, name: string) => {
    const words = name.replace(/([A-Z]([a-z]+)?)/g, " $1").toLowerCase().split(" ");
    const searchKeywords = search.toLowerCase().split(" ");
    return searchKeywords.every(keyword => words.includes(keyword)) || words.every(keyword => searchKeywords.includes(keyword)) || name.toLowerCase().includes(search.toLowerCase());
};


function RenderIcons({ search }: { search: string; }) {
    return <div className="vc-icons-tab-grid-container"
        style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
            gap: "8px",
        }}
    >
        {Object.entries(Icons).map(([iconName, Icon]) =>
            searchMatch(search, iconName) && <React.Fragment key={iconName}>
                <div className="vc-icon-box">
                    <Clickable onClick={() => openIconModal(iconName, Icon)}>
                        <div className="vc-icon-container">
                            <Icon className="vc-icon-icon" size="xxl" />
                        </div>
                    </Clickable>
                    <Forms.FormTitle className="vc-icon-title" tag="h3">{iconName}</Forms.FormTitle>
                </div>
            </React.Fragment>
        )}</div>;
}

function IconsTab() {
    const [search, setSearch] = React.useState<string>("");

    return (
        <SettingsTab title="Icons">
            <TextInput autoFocus value={search} placeholder="Search for an icon..." onChange={setSearch} />
            <RenderIcons search={search} />
        </SettingsTab>
    );
}

export default wrapTab(IconsTab, "IconsTab");
