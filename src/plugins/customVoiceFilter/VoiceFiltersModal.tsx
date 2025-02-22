/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PencilIcon } from "@components/Icons";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { PluginNative } from "@utils/types";
import { Button, Flex, Forms, Text, TextInput, Tooltip, useEffect, useState } from "@webpack/common";
import { JSX } from "react";

import { openCreateVoiceModal } from "./CreateVoiceFilterModal";
import { openHelpModal } from "./HelpModal";
import { DownloadIcon, DownloadingIcon, PauseIcon, PlayIcon, RefreshIcon, TrashIcon } from "./Icons";
import { downloadCustomVoiceModel, getClient, IVoiceFilter, useVoiceFiltersStore, VoiceFilterStyles } from "./index";
import { cl, useAudio } from "./utils";
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
            <ModalContent className="vc-voice-filters-modal">
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


    const downloadIconProps = {
        className: VoiceFilterStyles.thumbnail,
        style: { zoom: 0.4, margin: "auto", inset: 0 }
    };

    const playPauseIconProps = {
        className: cl(VoiceFilterStyles.thumbnail, VoiceFilterStyles.hoverButtonCircle),
        style: { margin: "auto", inset: 0, width: "32px", height: "32px", padding: "24px", transform: "0px 0px" }
    };

    return (
        <div className={cl(VoiceFilterStyles.filter, VoiceFilterStyles[styleKey])} onClick={async () => {
            if (!voiceFilter.available) return;

            // download and preview if downloaded
            if (client === "desktop" && modelState.status === "not_downloaded") {
                setModelState({ status: "downloading", downloadedBytes: 0 });
                const res = await downloadCustomVoiceModel(voiceFilter);
                if (res.success) setModelState({ status: "downloaded", downloadedBytes: 0 });
            }
        }}>
            <div className={cl(VoiceFilterStyles.selector, VoiceFilterStyles.selector)} role="button" tabIndex={0}>
                <div className={VoiceFilterStyles.iconTreatmentsWrapper}>
                    <div className={cl(
                        "vc-voice-filters-voice-filter",
                        VoiceFilterStyles.profile,
                        !voiceFilter.available || (client === "desktop" && modelState.status !== "downloaded")
                            ? VoiceFilterStyles.underDevelopment : "vc-voice-filters-voice-filter-available"
                    )}>
                        <img className={VoiceFilterStyles.thumbnail} alt="" src={iconURL ?? ""} draggable={false} />
                        {voiceFilter.available && <>
                            {client === "desktop" && modelState.status === "not_downloaded" && <div><DownloadIcon {...downloadIconProps} /></div>}
                            {client === "desktop" && modelState.status === "downloading" && <div><DownloadingIcon {...downloadIconProps} /></div>}
                            {((client === "desktop" && modelState.status === "downloaded") || client === "web") && <div onClick={() =>
                                isPlaying ? stopSound() : playSound()
                            }>{isPlaying ? <PauseIcon {...playPauseIconProps} /> : <PlayIcon {...playPauseIconProps} />}</div>}
                        </>}
                    </div>
                </div>
                <Text variant="text-xs/medium" className={VoiceFilterStyles.filterName}>
                    {voiceFilter.available ? name : "🚧 " + name}
                </Text>
            </div>

            {voiceFilter.available && ((client === "desktop" && modelState.status === "downloaded") || (client === "web")) && (
                <>
                    <Tooltip text="Update">
                        {({ ...props }) =>
                            <div className={className} role="button" tabIndex={-1} {...props} onClick={() => updateById(id)}>
                                <RefreshIcon width={16} height={16} />
                            </div>
                        }
                    </Tooltip>
                    <Tooltip text="Delete">
                        {({ ...props }) =>
                            <div className={className} role="button" tabIndex={-1} style={{ left: "65px" }} {...props} onClick={() => deleteById(id)}>
                                <TrashIcon width={16} height={16} style={{ color: "#f44" }} />
                            </div>
                        }
                    </Tooltip>
                    <Tooltip text="Export">
                        {({ ...props }) =>
                            <div className={className} role="button" tabIndex={-1} style={{ top: "65px" }} {...props} onClick={() => exportIndividualVoice(id)}>
                                <DownloadIcon width={16} height={16} />
                            </div>
                        }
                    </Tooltip>
                    <Tooltip text="Edit">
                        {({ ...props }) =>
                            <div className={className} role="button" tabIndex={-1} style={{ top: "65px", left: "65px" }} {...props} onClick={() => openCreateVoiceModal(voiceFilter)} >
                                <PencilIcon width={16} height={16} />
                            </div>
                        }
                    </Tooltip>
                </>
            )}
        </div>
    );
}

