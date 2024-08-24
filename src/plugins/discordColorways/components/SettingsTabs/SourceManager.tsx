/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, ReactNode, useEffect, useState, openModal } from "../../";
import { CopyIcon, DeleteIcon, DownloadIcon, ImportIcon, PlusIcon } from "../Icons";

import { defaultColorwaySource } from "../../constants";
import { Colorway, ModalProps } from "../../types";
import TabBar from "../TabBar";
import { chooseFile, saveFile } from "../../utils";
import { updateRemoteSources } from "../../wsClient";

export function StoreNameModal({ modalProps, originalName, onFinish, conflicting }: { modalProps: ModalProps, originalName: string, onFinish: (newName: string) => Promise<void>, conflicting: boolean; }) {
    const [error, setError] = useState<string>("");
    const [newStoreName, setNewStoreName] = useState<string>(originalName);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            {conflicting ? "Duplicate Store Name" : "Give this store a name"}
        </h2>
        <div className="colorwaysModalContent">
            {conflicting ? <span className="colorwaysModalSectionHeader">A store with the same name already exists. Please give a different name to the imported store:</span> : <></>}
            <span className="colorwaysModalSectionHeader">Name:</span>
            <input type="text" className="colorwayTextBox" value={newStoreName} onChange={({ currentTarget: { value } }) => setNewStoreName(value)} style={{ marginBottom: "16px" }} />
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                    setError("");
                    if ((await DataStore.get("customColorways")).map(store => store.name).includes(newStoreName)) {
                        return setError("Error: Store name already exists");
                    }
                    onFinish(newStoreName);
                    modalProps.onClose();
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                style={{ marginLeft: 8 }}
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </button>
        </div>
    </div>;
}

function AddOnlineStoreModal({ modalProps, onFinish }: { modalProps: ModalProps, onFinish: (name: string, url: string) => void; }) {
    const [colorwaySourceName, setColorwaySourceName] = useState<string>("");
    const [colorwaySourceURL, setColorwaySourceURL] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [URLError, setURLError] = useState<string>("");
    const [nameReadOnly, setNameReadOnly] = useState<boolean>(false);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            Add a source:
        </h2>
        <div className="colorwaysModalContent">
            <span className="colorwaysModalSectionHeader">Name:</span>
            <input
                type="text"
                className="colorwayTextBox"
                placeholder="Enter a valid Name..."
                onInput={e => setColorwaySourceName(e.currentTarget.value)}
                value={colorwaySourceName}
                readOnly={nameReadOnly}
                disabled={nameReadOnly}
            />
            <span className="colorwaysModalSectionHeader" style={{ marginTop: "8px" }}>URL:</span>
            <input
                type="text"
                className="colorwayTextBox"
                placeholder="Enter a valid URL..."
                onChange={({ currentTarget: { value } }) => {
                    setColorwaySourceURL(value);
                    if (value === defaultColorwaySource) {
                        setNameReadOnly(true);
                        setColorwaySourceName("Project Colorway");
                    }
                }}
                value={colorwaySourceURL}
                style={{ marginBottom: "16px" }}
            />
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                onClick={async () => {
                    const sourcesArr: { name: string, url: string; }[] = (await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]);
                    if (!colorwaySourceName) {
                        setNameError("Error: Please enter a valid name");
                    }
                    else if (!colorwaySourceURL) {
                        setURLError("Error: Please enter a valid URL");
                    }
                    else if (sourcesArr.map(s => s.name).includes(colorwaySourceName)) {
                        setNameError("Error: An online source with that name already exists");
                    }
                    else if (sourcesArr.map(s => s.url).includes(colorwaySourceURL)) {
                        setURLError("Error: An online source with that url already exists");
                    } else {
                        onFinish(colorwaySourceName, colorwaySourceURL);
                        modalProps.onClose();
                    }
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </button>
        </div>
    </div>;
}

export default function ({
    hasTheme = false
}: {
    hasTheme?: boolean;
}) {
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    function Container({ children }: { children: ReactNode; }) {
        if (hasTheme) return <div className="colorwaysModalTab" data-theme={theme}>{children}</div>;
        else return <div className="colorwaysModalTab">{children}</div>;
    }

    return <Container>
        <TabBar items={[
            {
                name: "Online",
                component: OnlineTab
            },
            {
                name: "Offline",
                component: OfflineTab
            }
        ]} />
    </Container >;
}

function OfflineTab() {
    const [customColorwayStores, setCustomColorwayStores] = useState<{ name: string, colorways: Colorway[]; }[]>([]);
    useEffect(() => {
        (async function () {
            setCustomColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
            updateRemoteSources();
        })();
    }, []);
    return <div className="colorwaySourceTab">
        <div style={{
            display: "flex",
            gap: "8px"
        }}>
            <button
                className="colorwaysPillButton"
                style={{ flexShrink: "0" }}
                onClick={async () => {
                    const file = await chooseFile("application/json");
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            if ((await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]).map(store => store.name).includes(JSON.parse(reader.result as string).name)) {
                                openModal(props => <StoreNameModal conflicting modalProps={props} originalName={JSON.parse(reader.result as string).name} onFinish={async e => {
                                    await DataStore.set("customColorways", [...await DataStore.get("customColorways"), { name: e, colorways: JSON.parse(reader.result as string).colorways }]);
                                    setCustomColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
                                    updateRemoteSources();
                                }} />);
                            } else {
                                await DataStore.set("customColorways", [...await DataStore.get("customColorways"), JSON.parse(reader.result as string)]);
                                setCustomColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
                                updateRemoteSources();
                            }
                        } catch (err) {
                            console.error("DiscordColorways: " + err);
                        }
                    };
                    reader.readAsText(file);
                    updateRemoteSources();
                }}
            >
                <ImportIcon width={14} height={14} />
                Import...
            </button>
            <button
                className="colorwaysPillButton"
                style={{ flexShrink: "0" }}
                onClick={() => {
                    openModal(props => <StoreNameModal conflicting={false} modalProps={props} originalName="" onFinish={async e => {
                        await DataStore.set("customColorways", [...await DataStore.get("customColorways"), { name: e, colorways: [] }]);
                        setCustomColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
                        props.onClose();
                        updateRemoteSources();
                    }} />);
                }}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    role="img"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z"
                    />
                </svg>
                New...
            </button>
        </div>
        <div className="colorwaysSettings-sourceScroller">
            {getComputedStyle(document.body).getPropertyValue("--os-accent-color") ? <div className={`colorwaysSettings-colorwaySource`} style={{ flexDirection: "column", padding: "16px", alignItems: "start" }}>
                <div style={{ alignItems: "center", width: "100%", height: "30px", display: "flex" }}>
                    <span className="colorwaysSettings-colorwaySourceLabel">OS Accent Color{" "}
                        <div className="colorways-badge">Built-In</div>
                    </span>
                </div>
            </div> : <></>}
            {customColorwayStores.map(({ name: customColorwaySourceName, colorways: offlineStoreColorways }) => <div className={`colorwaysSettings-colorwaySource`} style={{ flexDirection: "column", padding: "16px", alignItems: "start" }}>
                <span className="colorwaysSettings-colorwaySourceLabel">
                    {customColorwaySourceName}
                </span>
                <div style={{ marginLeft: "auto", gap: "8px", display: "flex" }}>
                    <button
                        className="colorwaysPillButton colorwaysPillButton-onSurface"
                        onClick={async () => {
                            saveFile(new File([JSON.stringify({ "name": customColorwaySourceName, "colorways": [...offlineStoreColorways] })], `${customColorwaySourceName.replaceAll(" ", "-").toLowerCase()}.colorways.json`, { type: "application/json" }));
                        }}
                    >
                        <DownloadIcon width={14} height={14} /> Export as...
                    </button>
                    <button
                        className="colorwaysPillButton colorwaysPillButton-onSurface"
                        onClick={async () => {
                            var sourcesArr: { name: string, colorways: Colorway[]; }[] = [];
                            const customColorwaySources = await DataStore.get("customColorways");
                            customColorwaySources.map((source: { name: string, colorways: Colorway[]; }) => {
                                if (source.name !== customColorwaySourceName) {
                                    sourcesArr.push(source);
                                }
                            });
                            DataStore.set("customColorways", sourcesArr);
                            setCustomColorwayStores(sourcesArr);
                            updateRemoteSources();
                        }}
                    >
                        <DeleteIcon width={20} height={20} /> Remove
                    </button>
                </div>
            </div>
            )}
        </div>
    </div>;
}

function OnlineTab() {
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<{ name: string, url: string; }[]>([]);
    useEffect(() => {
        (async function () {
            setColorwaySourceFiles(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]);
            updateRemoteSources();
        })();
    }, []);
    return <div className="colorwaySourceTab">
        <div style={{
            display: "flex",
            gap: "8px"
        }}>
            <button
                className="colorwaysPillButton"
                style={{ flexShrink: "0" }}
                onClick={() => {
                    openModal(props => <AddOnlineStoreModal modalProps={props} onFinish={async (name, url) => {
                        await DataStore.set("colorwaySourceFiles", [...await DataStore.get("colorwaySourceFiles"), { name: name, url: url }]);
                        setColorwaySourceFiles([...await DataStore.get("colorwaySourceFiles"), { name: name, url: url }]);
                        updateRemoteSources();
                    }} />);
                }}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    role="img"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24">
                    <path
                        fill="currentColor"
                        d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z"
                    />
                </svg>
                Add...
            </button>
        </div>
        <div className="colorwaysSettings-sourceScroller">
            {!colorwaySourceFiles.length && <div className={`colorwaysSettings-colorwaySource`} style={{ flexDirection: "column", padding: "16px", alignItems: "start" }} onClick={async () => {
                DataStore.set("colorwaySourceFiles", [{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
                setColorwaySourceFiles([{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
            }}>
                <PlusIcon width={24} height={24} />
                <span className="colorwaysSettings-colorwaySourceLabel">
                    Add Project Colorway Source
                </span>
            </div>}
            {colorwaySourceFiles.map((colorwaySourceFile: { name: string, url: string; }, i: number) => <div className={`colorwaysSettings-colorwaySource`} style={{ flexDirection: "column", padding: "16px", alignItems: "start" }}>
                <div className="hoverRoll">
                    <span className="colorwaysSettings-colorwaySourceLabel hoverRoll_normal">
                        {colorwaySourceFile.name} {colorwaySourceFile.url === defaultColorwaySource && <div className="colorways-badge">Built-In</div>} {colorwaySourceFile.url === "https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json" && <div className="colorways-badge">Built-In | Outdated</div>}
                    </span>
                    <span className="colorwaysSettings-colorwaySourceLabel hoverRoll_hovered">
                        {colorwaySourceFile.url}
                    </span>
                </div>
                <div style={{ marginLeft: "auto", gap: "8px", display: "flex" }}>
                    <button
                        className="colorwaysPillButton colorwaysPillButton-onSurface"
                        onClick={() => { navigator.clipboard.writeText(colorwaySourceFile.url); }}
                    >
                        <CopyIcon width={14} height={14} /> Copy URL
                    </button>
                    {colorwaySourceFile.url === "https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json" && <button
                        className="colorwaysPillButton colorwaysPillButton-onSurface"
                        onClick={async () => {
                            DataStore.set("colorwaySourceFiles", [{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
                            setColorwaySourceFiles([{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            x="0px"
                            y="0px"
                            width="14"
                            height="14"
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
                        </svg> Update source...
                    </button>}
                    {(colorwaySourceFile.url !== defaultColorwaySource && colorwaySourceFile.url !== "https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json")
                        && <>
                            <button
                                className="colorwaysPillButton colorwaysPillButton-onSurface"
                                onClick={async () => {
                                    openModal(props => <StoreNameModal conflicting={false} modalProps={props} originalName={colorwaySourceFile.name || ""} onFinish={async e => {
                                        const res = await fetch(colorwaySourceFile.url);
                                        const data = await res.json();
                                        DataStore.set("customColorways", [...await DataStore.get("customColorways"), { name: e, colorways: data.colorways || [] }]);
                                        updateRemoteSources();
                                    }} />);
                                }}
                            >
                                <DownloadIcon width={14} height={14} /> Download...
                            </button>
                            <button
                                className="colorwaysPillButton colorwaysPillButton-onSurface"
                                onClick={async () => {
                                    DataStore.set("colorwaySourceFiles", (await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter((src, ii) => ii !== i));
                                    setColorwaySourceFiles((await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter((src, ii) => ii !== i));
                                    updateRemoteSources();
                                }}
                            >
                                <DeleteIcon width={14} height={14} /> Remove
                            </button>
                        </>}
                </div>
            </div>
            )}
        </div>
    </div>;
}
