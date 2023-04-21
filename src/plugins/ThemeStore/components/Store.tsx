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

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Logger } from "@utils/index";
import { LazyComponent } from "@utils/misc";
import { useIntersection } from "@utils/react";
import { findByProps } from "@webpack";
import { Flex, Forms, React, Text } from "@webpack/common";

import { getThemes, ThemeSearchResult } from "../API";


const cl = classNameFactory("vc-themes-store-");
const LoadingPopout = LazyComponent(
    () => findByProps("LoadingPopout").LoadingPopout
);

const logger = new Logger("ThemeStore");

const ThemeCard = ({ theme }: { theme: ThemeSearchResult; }) => {
    return (
        <Flex className={cl("card")} flexDirection="column">
            <div className={cl("thumbnail-preview")}>
                <img src={theme.preview} alt={`${theme.meta.name} - Preview`} />
            </div>
            <div className={cl("card-body")}>
                <Text variant="text-md/bold" className={cl("name")}>
                    {theme.meta.name}
                </Text>
                <Text className={cl("note")} variant="text-sm/normal">
                    {theme.meta.description}
                </Text>
            </div>
        </Flex>
    );
};

export const Store = () => {
    const [themes, setThemes] = React.useState<{ [page: number]: ThemeSearchResult[]; }>({});
    const [refCallback, isIntersecting] = useIntersection(true);
    const [reachedEnd, setReachedEnd] = React.useState(false);
    const [page, setPage] = React.useState(1);

    const [loadedFirstPage, setLoadedFirstPage] = React.useState(false);

    React.useEffect(() => {
        getThemes({ page }).then(data => {
            setThemes({ [page]: data });
            setLoadedFirstPage(true);
        });
    }, []);

    React.useEffect(() => {
        if (!loadedFirstPage) return;

        if (isIntersecting && !reachedEnd) {
            setPage(oldPage => {
                getThemes({ page: oldPage + 1 }).then(data => {
                    if (!data.length) setReachedEnd(true);
                    setThemes({ ...themes, [oldPage + 1]: data });
                });
                logger.info("Fetched page", oldPage + 1, "of themes!");

                return oldPage + 1;
            });
        }
    }, [isIntersecting, reachedEnd]);

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

                <div className={cl("grid")}>
                    {Object.entries(themes)
                        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                        .map(([, themes]) => themes)
                        .flat()
                        .map(theme => {
                            return <ThemeCard theme={theme} />;
                        })}
                </div>

                <div className={cl("loading-spinner")}>
                    <div ref={refCallback}>
                        {isIntersecting && !reachedEnd && <LoadingPopout />}
                    </div>
                </div>

                <div className={cl("reached-end")}>
                    {reachedEnd && (
                        <Text variant="heading-sm/medium">
                            You've reached the end of the theme store!
                        </Text>
                    )}
                </div>
            </Forms.FormSection>
        </ErrorBoundary>
    );
};
