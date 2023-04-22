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

import "./style.css";

import { DataStore } from "@api/index";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Flex, Forms, React, SearchableSelect, Text, TextInput } from "@webpack/common";

import { ThemeSearchOptions } from "../API";
import { Theme } from "../types";

const dataStoreKey = "themeStore-bd-themes-json";
const cl = classNameFactory("vc-themes-store-");


const ThemeCard = ({ theme }: { theme: Theme; }) => {
    return (
        <Flex className={cl("card")} flexDirection="column">
            <div className={cl("thumbnail-preview")}>
                <img src={theme.thumbnail_url!!} alt={`${theme.name} - Preview`} />
            </div>
            <div className={cl("card-body")}>
                <Text variant="text-md/bold" className={cl("name")}>
                    {theme.name}
                </Text>
                <Text className={cl("note")} variant="text-sm/normal">
                    {theme.description}
                </Text>
            </div>
        </Flex>
    );
};

const tags = [
    "flat", "transparent", "layout",
    "customizable", "fiction", "nature",
    "space", "dark", "light", "game",
    "anime", "red", "orange", "green",
    "purple", "black", "other", "high-contrast",
    "white", "aqua", "animated", "yellow",
    "blue", "abstract"
];

export const Store = () => {
    const [themes, setThemes] = React.useState<Theme[]>([]);

    const [filters, setFilters] = React.useState<ThemeSearchOptions>({ tags: [], query: "" });

    React.useEffect(() => {
        const fetchThemes = async () => {
            const data = await DataStore.get<{ themes: Theme[], timestamp: number; }>(dataStoreKey);
            if (!data) {
                fetchThemes();
                return;
            }
            setThemes(data.themes);
        };

        fetchThemes();
    }, []);

    return (
        <ErrorBoundary onError={handleComponentFailed}>
            <Forms.FormSection>
                <Text
                    tag="h2"
                    className={cl("header")}
                    variant="heading-lg/semibold"
                    style={{ color: "var(--header-primary)" }}
                >
                    Theme Store
                </Text>

                <div className={cl("filters")}>
                    <SearchableSelect
                        multi={true}
                        closeOnSelect={false}
                        options={tags.map(t => ({ label: t, value: t }))}
                        value={filters.tags}
                        onChange={(value: string[]) => {
                            setFilters({ ...filters, tags: value });
                        }}
                        className={"theme-store-multi-select"}
                        placeholder="Select Tags"
                    />

                    <TextInput
                        className={"query"}
                        placeholder="Search themes..."
                    />
                </div>

                <div className={cl("grid")}>
                    {themes
                        .filter(theme => {
                            let matches = true;
                            for (const tag of filters.tags) {
                                if (!theme.tags.includes(tag)) {
                                    matches = false;
                                    break;
                                }
                            }
                            return matches;
                        })
                        .map(theme => {
                            return <ThemeCard theme={theme} />;
                        })}
                </div>

                <div className={cl("reached-end")}>
                    <Text variant="heading-sm/medium">
                        You've reached the end of the theme store!
                    </Text>
                </div>
            </Forms.FormSection>
        </ErrorBoundary>
    );
};
