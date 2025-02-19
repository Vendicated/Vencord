/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { PluginNative } from "@utils/types";
import { Button, Flex, Forms, Text, TextInput, useEffect, useState } from "@webpack/common";
import { JSX } from "react";

import { openCreateVoiceModal } from "./CreateVoiceFilterModal";
import { openHelpModal } from "./HelpModal";
import { DownloadIcon, DownloadingIcon, PauseIcon, PlayIcon } from "./Icons";
import { downloadCustomVoiceModel, getClient, IVoiceFilter, useVoiceFiltersStore, VoiceFilterStyles } from "./index";
import { useAudio } from "./utils";
import { openWikiHomeModal } from "./WikiHomeModal";

const Native = VencordNative.pluginHelpers.CustomVoiceFilters as PluginNative<typeof import("./native")>;

export function openVoiceFiltersModal(): string {
    const key = openModal(modalProps => (
        <VoiceFiltersModal
            modalProps={modalProps}
            close={() => closeModal(key)}
            accept={() => {
                // console.warn("accepted", url);
                closeModal(key);
            }}
        />
    ));
    return key;
}

interface VoiceFiltersModalProps {
    modalProps: ModalProps;
    close: () => void;
    accept: () => void;
}

function VoiceFiltersModal({ modalProps, close, accept }: VoiceFiltersModalProps): JSX.Element {
    const [url, setUrl] = useState("");
    const { downloadVoicepack, deleteAll, exportVoiceFilters, importVoiceFilters, voiceFilters } = useVoiceFiltersStore();
    const { client } = getClient();
    const voiceComponents = Object.values(voiceFilters).map(voice =>
        <VoiceFilter {...voice} key={voice.id} />
    );

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Custom Voice Filters Menu
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ paddingBlock: "0.5rem" }}>
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Text>Download a voicepack from a url or paste a voicepack data here:</Text>
                    <TextInput
                        value={url}
                        placeholder="( e.g. https://fox3000foxy.com/voicepacks/agents.json )"
                        onChange={setUrl}
                        onKeyDown={e => { if (e.key === "Enter") downloadVoicepack(url); }}
                        style={{ width: "100%" }}
                    />
                    <Flex style={{ gap: "0.5rem" }}>
                        <Button onClick={() => downloadVoicepack(url)}>Download</Button>
                        <Button onClick={deleteAll} color={Button.Colors.RED}>Delete all</Button>
                        <Button onClick={exportVoiceFilters} color={Button.Colors.TRANSPARENT}>Export</Button>
                        <Button onClick={importVoiceFilters} color={Button.Colors.TRANSPARENT}>Import</Button>
                        <Button onClick={() => downloadVoicepack("https://fox3000foxy.com/voicepacks/agents.json")} color={Button.Colors.TRANSPARENT}>Download Default</Button>
                    </Flex>

                    <Text>Voice filters list:</Text>
                    <Flex style={{ gap: "0.5rem" }} wrap={Flex.Wrap.WRAP}>
                        {voiceComponents.length > 0 ? voiceComponents : <Text style={{ fontStyle: "italic" }}>No voice filters found</Text>}
                    </Flex>
                    {client === "web" && <Text style={{ fontStyle: "italic" }}>⚠️ Voice filters are not available on web client or vesktop! Please use the desktop client to use custom voice filters.</Text>}
                    {/* Temporary message about the experiment rollout */}
                    <Text style={{ fontStyle: "italic" }}>
                        ⚠️ Voice filters are currently in experimental rollout. So things may not work as expected. However, you can still create and download voicepacks.
                    </Text>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={openHelpModal}>Learn how to build your own voicepack</Button>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => openCreateVoiceModal()}>Create Voicepack</Button>
                    <Button color={Button.Colors.GREEN} onClick={openWikiHomeModal}>Wiki</Button>
                    <Button color={Button.Colors.RED} onClick={accept}>Close</Button>
                </Flex>
            </ModalFooter >
        </ModalRoot >
    );
}


// Voice Filter
function VoiceFilter(voiceFilter: IVoiceFilter): JSX.Element {
    const { name, previewSoundURLs, styleKey, iconURL, id } = voiceFilter;
    const { updateById, deleteById, exportIndividualVoice, modulePath } = useVoiceFiltersStore();
    const className = `${VoiceFilterStyles.hoverButtonCircle} ${VoiceFilterStyles.previewButton}`;
    const [modelState, setModelState] = useState({ status: "not_downloaded", downloadedBytes: 0 });
    const { client } = getClient();
    const { playSound, isPlaying, stopSound } = useAudio({ source: previewSoundURLs?.[0] });

    useEffect(() => {
        const fetchModelState = async () => {
            if (client === "desktop") {
                const modelState = await Native.getModelState(voiceFilter.id, modulePath);
                setModelState(modelState);
            }
        };
        fetchModelState();
    }, [modulePath]);

    return (
        <div className={`${VoiceFilterStyles.filter} ${VoiceFilterStyles[styleKey]}`} onClick={async () => {
            if (!voiceFilter.available) return;

            // download and preview if downloaded
            if (client === "desktop" && modelState.status === "not_downloaded") {
                setModelState({ status: "downloading", downloadedBytes: 0 });
                const res = await downloadCustomVoiceModel(voiceFilter);
                if (res.success) setModelState({ status: "downloaded", downloadedBytes: 0 });
            }
        }}>
            <div className={`${VoiceFilterStyles.selector} ${VoiceFilterStyles.selector}`} role="button" tabIndex={0}>
                <div className={VoiceFilterStyles.iconTreatmentsWrapper}>
                    <div className={`${VoiceFilterStyles.profile} ${!voiceFilter.available || (client === "desktop" && modelState.status !== "downloaded") ? VoiceFilterStyles.underDevelopment : ""
                        }`}>
                        <img className={VoiceFilterStyles.thumbnail} alt="" src={iconURL ?? ""} draggable={false} />
                        {client === "desktop" && voiceFilter.available && modelState.status === "not_downloaded" && <div><DownloadIcon /></div>}
                        {client === "desktop" && voiceFilter.available && modelState.status === "downloading" && <div><DownloadingIcon /></div>}
                        {((client === "desktop" && voiceFilter.available && modelState.status === "downloaded") || (client === "web" && voiceFilter.available)) && <div onClick={() =>
                            isPlaying ? stopSound() : playSound()
                        }>{isPlaying ? <PauseIcon /> : <PlayIcon />}</div>}
                    </div>
                </div>
                <Text variant="text-xs/medium" className={VoiceFilterStyles.filterName}>
                    {voiceFilter.available ? name : "🚧 " + name}
                </Text>
            </div>

            {voiceFilter.available && ((client === "desktop" && modelState.status === "downloaded") || (client === "web")) ? (
                <>
                    <div onClick={() => updateById(id)} className={className} role="button" tabIndex={-1}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="M4 12a8 8 0 0 1 14.93-4H15a1 1 0 1 0 0 2h6a1 1 0 0 0 1-1V3a1 1 0 1 0-2 0v3a9.98 9.98 0 0 0-18 6 10 10 0 0 0 16.29 7.78 1 1 0 0 0-1.26-1.56A8 8 0 0 1 4 12Z" />
                        </svg>
                    </div>
                    <div onClick={() => deleteById(id)} className={className} role="button" tabIndex={-1} style={{ left: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#f44" d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z" />
                            <path fill="#f44" fillRule="evenodd" d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div onClick={() => exportIndividualVoice(id)} className={className} role="button" tabIndex={-1} style={{ top: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z" />
                        </svg>
                    </div>
                    <div onClick={() => openCreateVoiceModal(voiceFilter)} className={className} role="button" tabIndex={-1} style={{ top: "65px", left: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" />
                        </svg>
                    </div>
                </>) : <></>}
        </div>
    );
}

