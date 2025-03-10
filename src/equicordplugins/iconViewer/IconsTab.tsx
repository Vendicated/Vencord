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
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Button, Clickable, Forms, React, TextInput, TooltipContainer } from "@webpack/common";
import * as t from "@webpack/types";

import { openIconModal } from "./IconModal";
import { getNameByIcon } from "./names";
import { findAllByCode, IconsDef } from "./utils";

export let Icons: IconsDef | null = null;

function searchMatch(search: string, name: string, Icon: t.Icon, searchbyFunction: boolean): boolean {
    if (search === "") return true;
    if (searchbyFunction) {
        return String(Icon).includes(search);
    }
    const words = name.replace(/([A-Z]([a-z]+)?)/g, " $1").toLowerCase().split(" ");
    const searchKeywords = search.toLowerCase().split(" ");
    return searchKeywords.every(keyword => words.includes(keyword)) || words.every(keyword => searchKeywords.includes(keyword)) || name.toLowerCase().includes(search.toLowerCase());
}


function RenderIcons({ search, searchbyFunction }: { search: string; searchbyFunction: boolean; }) {
    if (Icons === null) {
        const OrgIcons = Array.from(new Set(findAllByCode("[\"size\",\"width\",\"height\",\"color\",\"colorClass\"]")));
        Icons = Object.fromEntries(Object.keys(OrgIcons).map(k => [String(getNameByIcon(OrgIcons[k], k)), OrgIcons[k]])) as IconsDef;
    }
    return <div className="vc-icons-tab-grid-container">
        {Object.entries(Icons).map(([iconName, Icon], index) =>
            searchMatch(search, iconName, Icon, searchbyFunction) && <React.Fragment key={`iv-${iconName}`}>
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
    const [searchByFunction, setSearchByFunction] = React.useState<boolean>(false);
    const MemoRenderIcons = React.memo(RenderIcons);

    return (
        <SettingsTab title="Icons">
            <div className={classes(Margins.top16, "vc-icon-tab-search-bar-grid")}>
                <TextInput autoFocus value={search} placeholder="Search for an icon..." onChange={setSearch} />
                <TooltipContainer text="Search by function context">
                    <Button
                        size={Button.Sizes.SMALL}
                        aria-label="Search by function context"
                        style={{ marginTop: "50%" }}
                        color={searchByFunction ? Button.Colors.GREEN : Button.Colors.PRIMARY}
                        onClick={() => setSearchByFunction(!searchByFunction)}
                    >Func</Button>
                </TooltipContainer>
            </div>
            <MemoRenderIcons search={search} searchbyFunction={searchByFunction} />
        </SettingsTab>
    );
}

export default wrapTab(IconsTab, "IconsTab");
