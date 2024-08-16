/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, ReactNode, useEffect, useState, openModal } from "../../";
import { DeleteIcon, DownloadIcon, PalleteIcon } from "../Icons";

import { StoreItem } from "../../types";
import Selector from "../Selector";

export default function ({
    hasTheme = false
}: {
    hasTheme?: boolean;
}) {
    const [storeObject, setStoreObject] = useState<StoreItem[]>([]);
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<{ name: string, url: string; }[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    useEffect(() => {
        if (!searchValue) {
            (async function () {
                const res: Response = await fetch("https://dablulite.vercel.app/");
                const data = await res.json();
                setStoreObject(data.sources);
                setColorwaySourceFiles(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]);
            })();
        }
    }, []);

    function Container({ children }: { children: ReactNode; }) {
        if (hasTheme) return <div className="colorwaysModalTab" data-theme={theme}>{children}</div>;
        else return <div className="colorwaysModalTab">{children}</div>;
    }

    return <Container>
        <div style={{ display: "flex", marginBottom: "8px" }}>
            <input
                type="text"
                className="colorwaySelector-search"
                placeholder="Search for sources..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
            />
            <button
                className="colorwaysPillButton"
                style={{ marginLeft: "8px", marginTop: "auto", marginBottom: "auto" }}
                onClick={async function () {
                    const res: Response = await fetch("https://dablulite.vercel.app/");
                    const data = await res.json();
                    setStoreObject(data.sources);
                    setColorwaySourceFiles(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]);
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    x="0px"
                    y="0px"
                    width="14"
                    height="14"
                    style={{ boxSizing: "content-box", flexShrink: 0 }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <rect
                        y="0"
                        fill="none"
                        width="24"
                        height="24"
                    />
                    <path
                        d="M6.351,6.351C7.824,4.871,9.828,4,12,4c4.411,0,8,3.589,8,8h2c0-5.515-4.486-10-10-10 C9.285,2,6.779,3.089,4.938,4.938L3,3v6h6L6.351,6.351z"
                    />
                    <path
                        d="M17.649,17.649C16.176,19.129,14.173,20,12,20c-4.411,0-8-3.589-8-8H2c0,5.515,4.486,10,10,10 c2.716,0,5.221-1.089,7.062-2.938L21,21v-6h-6L17.649,17.649z"
                    />
                </svg>
                Refresh
            </button>
        </div>
        <div className="colorwaysSettings-sourceScroller">
            {storeObject.map((item: StoreItem) =>
                item.name.toLowerCase().includes(searchValue.toLowerCase()) ? <div className={`colorwaysSettings-colorwaySource`} style={{ flexDirection: "column", padding: "16px", alignItems: "start" }}>
                    <div style={{ gap: ".5rem", display: "flex", marginBottom: "8px", flexDirection: "column" }}>
                        <span className="colorwaysSettings-colorwaySourceLabelHeader">
                            {item.name}
                        </span>
                        <span className="colorwaysSettings-colorwaySourceDesc">
                            {item.description}
                        </span>
                        <span className="colorwaysSettings-colorwaySourceDesc" style={{ opacity: ".8" }}>
                            by {item.authorGh}
                        </span>
                    </div>
                    <div style={{ gap: "8px", alignItems: "center", width: "100%", display: "flex" }}>
                        <a role="link" target="_blank" href={"https://github.com/" + item.authorGh}>
                            <img src="/assets/6a853b4c87fce386cbfef4a2efbacb09.svg" alt="GitHub" />
                        </a>
                        <button
                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                            style={{ marginLeft: "auto" }}
                            onClick={async () => {
                                if (colorwaySourceFiles.map(source => source.name).includes(item.name)) {
                                    const sourcesArr: { name: string, url: string; }[] = colorwaySourceFiles.filter(source => source.name !== item.name);
                                    DataStore.set("colorwaySourceFiles", sourcesArr);
                                    setColorwaySourceFiles(sourcesArr);
                                } else {
                                    const sourcesArr: { name: string, url: string; }[] = [...colorwaySourceFiles, { name: item.name, url: item.url }];
                                    DataStore.set("colorwaySourceFiles", sourcesArr);
                                    setColorwaySourceFiles(sourcesArr);
                                }
                            }}
                        >
                            {colorwaySourceFiles.map(source => source.name).includes(item.name) ? <><DeleteIcon width={14} height={14} /> Remove</> : <><DownloadIcon width={14} height={14} /> Add to Sources</>}
                        </button>
                        <button
                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                            onClick={async () => {
                                openModal(props => <div className={`colorwaysModal ${props.transitionState == 2 ? "closing" : ""} ${props.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
                                    <h2 className="colorwaysModalHeader">
                                        Previewing colorways for {item.name}
                                    </h2>
                                    <div className="colorwaysModalContent colorwaysModalContent-sourcePreview">
                                        <Selector settings={{ selectorType: "preview", previewSource: item.url }} />
                                    </div>
                                </div>);
                            }}
                        >
                            <PalleteIcon width={14} height={14} />
                            Preview
                        </button>
                    </div>
                </div> : <></>
            )}
        </div>
    </Container>;
}
