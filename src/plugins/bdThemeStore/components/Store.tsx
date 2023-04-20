import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { Flex, Forms, Text } from "@webpack/common";
import { React } from "@webpack/common";
import { ThemeSearchResult, getThemes } from "../API";
import { LazyComponent, makeLazy } from "@utils/misc";

import "./style.css";
import { findByProps } from "@webpack";
import { useIntersection } from "@utils/react";
import { Logger } from "@utils/index";


const cl = classNameFactory("vc-bd-themes-store-");
const LoadingPopout = LazyComponent(
    () => findByProps("LoadingPopout").LoadingPopout
);

const logger = new Logger("ThemeStore");

const ThemeCard = ({ theme }: { theme: ThemeSearchResult; }) => {
    return (
        <Flex className={cl("card")} flexDirection="column">
            <div className={cl("card-header")}>
                <Text variant="text-md/bold" className={cl("name")}>
                    {theme.meta.name}
                </Text>
            </div>
            <div className={cl("thumbnail-preview")}>
                <img src={theme.preview} alt={`${theme.meta.name} - Preview`} />
            </div>
            <Text className={cl("note")} variant="text-sm/normal">
                {theme.meta.description}
            </Text>
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
        getThemes({ page }).then((data) => {
            setThemes({ [page]: data });
            setLoadedFirstPage(true);
        });
    }, []);

    React.useEffect(() => {
        if (!loadedFirstPage) return;

        if (isIntersecting && !reachedEnd) {
            setPage((oldPage) => {
                getThemes({ page: oldPage + 1 }).then((data) => {
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
                        .map((theme) => {
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
