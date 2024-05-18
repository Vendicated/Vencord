/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { SettingsTab } from "@components/VencordSettings/shared";
import { findByProps } from "@webpack";
import { Button, ScrollerThin, Text, TextInput, Tooltip, useEffect, useState } from "@webpack/common";

import { StoreItem } from "../../types";
import { DownloadIcon } from "../Icons";

export default function () {
    const [storeObject, setStoreObject] = useState<StoreItem[]>([]);
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<{ name: string, url: string; }[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

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

    const { item: radioBarItem, itemFilled: radioBarItemFilled } = findByProps("radioBar");

    return <SettingsTab title="Colorway Store">
        <Flex style={{ gap: "0", marginBottom: "8px" }}>
            <TextInput
                className="colorwaySelector-search"
                placeholder="Search for sources..."
                value={searchValue}
                onChange={setSearchValue}
            />
            <Tooltip text="Refresh...">
                {({ onMouseEnter, onMouseLeave }) => <Button
                    innerClassName="colorwaysSettings-iconButtonInner"
                    size={Button.Sizes.ICON}
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.OUTLINED}
                    style={{ marginLeft: "8px" }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
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
                        width="20"
                        height="20"
                        style={{ padding: "6px", boxSizing: "content-box" }}
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
                </Button>}
            </Tooltip>
        </Flex>
        <ScrollerThin orientation="vertical" className="colorwaysSettings-sourceScroller">
            {storeObject.map((item: StoreItem) =>
                item.name.toLowerCase().includes(searchValue.toLowerCase()) ? <div className={`${radioBarItem} ${radioBarItemFilled} colorwaysSettings-colorwaySource`}>
                    <Flex flexDirection="column" style={{ gap: ".5rem" }}>
                        <Text className="colorwaysSettings-colorwaySourceLabelHeader">
                            {item.name}
                        </Text>
                        <Text className="colorwaysSettings-colorwaySourceDesc">
                            {item.description}
                        </Text>
                        <Link className="colorwaysSettings-colorwaySourceDesc" href={"https://github.com/" + item.authorGh}>by {item.authorGh}</Link>
                    </Flex>
                    <Button
                        innerClassName="colorwaysSettings-iconButtonInner"
                        size={Button.Sizes.ICON}
                        color={colorwaySourceFiles.map(source => source.name).includes(item.name) ? Button.Colors.RED : Button.Colors.PRIMARY}
                        look={Button.Looks.OUTLINED}
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
                        {colorwaySourceFiles.map(source => source.name).includes(item.name) ? <DeleteIcon width={20} height={20} /> : <DownloadIcon width={20} height={20} />}
                    </Button>
                </div> : <></>
            )}
        </ScrollerThin>
    </SettingsTab>;
}
