/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Span } from "@components/Span";
import { ManaBaseRadioGroupProps } from "@equicordplugins/components.dev/types";
import { copyToClipboard } from "@utils/clipboard";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { lodash, ScrollerAuto, SearchableSelect, useEffect, useRef, useState } from "@webpack/common";

import { cl, decodeAudio, LANGUAGES, TranscriptionWorker } from "./utils";
const Native = VencordNative.pluginHelpers.VoiceMessageTranscriber as PluginNative<typeof import("./native")>;

const ChannelListIcon = findComponentByCodeLazy("1-1-1ZM2 8a1");
let ManaBaseRadioGroup: React.ComponentType<ManaBaseRadioGroupProps>;

const settings = definePluginSettings({
    selectedModel: {
        type: OptionType.SELECT,
        description: "Model size",
        options: [
            {
                label: "Tiny (Fastest, lowest accuracy)",
                value: "Xenova/whisper-tiny",
            },
            {
                label: "Base (Recommended)",
                value: "Xenova/whisper-base",
                default: true
            },
            {
                label: "Small",
                value: "Xenova/whisper-small"
            },
            {
                label: "Medium (Slowest, best accuracy)",
                value: "Xenova/whisper-medium"
            }
        ],
        restartNeeded: false
    },
    quantized: {
        type: OptionType.BOOLEAN,
        description: "Use quantized model (smaller size, slightly lower accuracy)",
        default: true,
        restartNeeded: false
    },
    delete: {
        type: OptionType.COMPONENT,
        component: () => {
            const [size, setSize] = useState(0);
            const [deleteKeys, setDeleteKeys] = useState<string[]>([]);

            useEffect(() => {
                DataStore.entries().then(entries => {
                    let size = 0;
                    const keys = [] as string[];

                    entries.forEach(([key, val]) => {
                        if (typeof key === "string" && key.startsWith("VoiceMessageTranscriber") && lodash.isArrayBuffer(val)) {
                            keys.push(key);
                            size += val.byteLength ?? 0;
                        }
                    });

                    setSize(size);
                    setDeleteKeys(keys);
                });
            }, []);

            return <Button
                variant="dangerPrimary"
                onClick={() => {
                    DataStore.delMany(deleteKeys).then(() => { setSize(0); setDeleteKeys([]); });
                }}
            >
                Delete all cached files ({(size / 1024 / 1024).toFixed(2)} MB)
            </Button>;
        }
    }
});

function LanguageSelectionModal(props: { modalProps: ModalProps, src: string; }) {
    const { modalProps, src } = props;
    const [language, setLanguage] = useState<string>("auto");
    const [task, setTask] = useState<string>("transcribe");

    const languageOptions = [
        { label: "Auto Detect", value: "auto" },
        ...Object.entries(LANGUAGES).map(([code, name]) => ({
            label: name.charAt(0).toUpperCase() + name.slice(1),
            value: code
        }))
    ];

    const start = () => {
        modalProps.onClose();
        openModal(modalProps => (
            <TranscriptionModal
                modalProps={modalProps}
                src={src}
                options={{ language, task }}
            />
        ));
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <BaseText size="lg" weight="bold" style={{ flexGrow: 1 }}>Transcription Options</BaseText>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent style={{ padding: "16px" }}>
                <Flex flexDirection="column" gap={20}>
                    <div>
                        <BaseText size="sm" weight="semibold" style={{ marginBottom: "8px" }}>
                            Audio Language
                        </BaseText>
                        <SearchableSelect
                            options={languageOptions}
                            value={languageOptions.find(o => o.value === language)?.value}
                            onChange={setLanguage}
                        />
                    </div>

                    <div>
                        <BaseText size="sm" weight="semibold" style={{ marginBottom: "8px" }}>
                            Action
                        </BaseText>
                        <ManaBaseRadioGroup
                            options={[{
                                name: "Transcribe",
                                value: "transcribe"
                            }, {
                                name: "Translate to English",
                                value: "translate"
                            }]}
                            value={task}
                            onChange={v => setTask(v as string)}
                        />
                    </div>

                    <Button onClick={start} variant="primary">
                        Start
                    </Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

function TranscriptionModal(props: { modalProps: ModalProps, src: string, options: { language: string, task: string; }; }) {
    const { modalProps, src, options } = props;
    const [status, setStatus] = useState<string>("initializing");
    const [result, setResult] = useState<{ text: string, chunks: { timestamp: [number, number], text: string; }[]; } | null>(null);
    const [showTimestamps, setShowTimestamps] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const workerRef = useRef<TranscriptionWorker | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setStatus("downloading_audio");
                setError(null);

                let blob: Blob;
                if (IS_DISCORD_DESKTOP || IS_EQUIBOP) {
                    const arrayBuffer = await Native.fetchAudio(src);
                    blob = new Blob([arrayBuffer as any]);
                } else {
                    const res = await fetch(src);
                    if (!res.ok) throw new Error("Failed to download audio");
                    blob = await res.blob();
                }

                if (!active) return;
                setStatus("processing_audio");
                const audioData = await decodeAudio(blob);

                if (!active) return;
                workerRef.current = new TranscriptionWorker(
                    s => {
                        if (active) setStatus(s);
                    },
                    out => {
                        if (active) {
                            setResult(out);
                            setStatus("complete");
                        }
                    },
                    err => {
                        if (active) setError(String(err));
                    },
                    partial => {
                        if (active) setResult(partial);
                    }
                );

                const { quantized, selectedModel } = settings.store;
                workerRef.current.run(
                    audioData,
                    selectedModel,
                    quantized,
                    options.language === "auto" ? undefined : options.language,
                    options.task
                );
            } catch (err) {
                if (active) setError(String(err));
            }
        })();

        return () => {
            active = false;
            workerRef.current?.terminate();
        };
    }, [src, retryCount]);

    const retry = () => {
        setError(null);
        setStatus("initializing");
        setResult(null);
        setCopied(false);
        setRetryCount(prev => prev + 1);
    };

    const formatTimestamp = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const displayText = result ? (
        showTimestamps
            ? result.chunks.map(c => `[${formatTimestamp(c.timestamp[0])} - ${formatTimestamp(c.timestamp[1])}] ${c.text}`).join("\n")
            : result.text
    ) : "";

    return <ModalRoot {...modalProps} size={ModalSize.LARGE}>
        <ModalHeader>
            <BaseText size="lg" weight="bold" style={{ flexGrow: 1 }}>Transcription</BaseText>
            <ModalCloseButton onClick={modalProps.onClose} />
        </ModalHeader>
        <ModalContent className={cl("content")}>
            {error ? (
                <Flex flexDirection="column" gap={16} style={{ padding: "20px 0" }}>
                    <Heading tag="h3" style={{ color: "var(--red-360)" }}>Error</Heading>
                    <Span style={{ whiteSpace: "pre-wrap" }}>{error}</Span>
                    <Button onClick={retry}>
                        Retry
                    </Button>
                </Flex>
            ) : (status === "complete" || (status === "transcribing" && result)) ? (
                <Flex flexDirection="column" gap={16} style={{ paddingBottom: "20px" }}>
                    {status === "transcribing" && (
                        <Span size="sm" color="text-muted">Transcribing in progress...</Span>
                    )}
                    <ScrollerAuto className={cl("result")}>
                        <Span>{displayText}</Span>
                    </ScrollerAuto>
                    <Flex flexDirection="row" gap={12} alignItems="center">
                        <div style={{ flexGrow: 1 }}>
                            <FormSwitch
                                title="Show Timestamps"
                                value={showTimestamps}
                                onChange={setShowTimestamps}
                            />
                        </div>
                    </Flex>
                    <Button
                        disabled={status === "transcribing" || copied}
                        onClick={() => {
                            copyToClipboard(displayText);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                    >
                        {copied ? "Copied!" : "Copy to Clipboard"}
                    </Button>
                </Flex>
            ) : (
                <Flex flexDirection="column" gap={16} style={{ padding: "20px 0", alignItems: "center" }}>
                    <Heading tag="h3">
                        {status === "initializing" && "Initializing..."}
                        {status === "downloading_audio" && "Downloading Audio..."}
                        {status === "processing_audio" && "Processing Audio..."}
                        {status === "loading" && "Loading Model..."}
                        {status === "transcribing" && "Transcribing..."}
                    </Heading>
                </Flex>
            )}
        </ModalContent>
    </ModalRoot>;
}

export default definePlugin({
    name: "VoiceMessageTranscriber",
    authors: [Devs.TheSun],
    description: "On-device transcriptions for voice messages powered by Whisper v3",
    tags: ["Chat", "Media", "Utility", "Voice"],
    patches: [
        {
            find: ".VOICE_MESSAGE)),",
            replacement: {
                match: /"source",{src:(\i).{0,700}duration:\i}\),/,
                replace: "$&$self.button($1),"
            }
        },
        {
            find: '"data-mana-component":"BaseRadioGroup"',
            replacement: {
                match: /(?=function (\i)\(\i\)\{.{0,400}"data-mana-component":"BaseRadioGroup")/,
                replace: "$self.ManaBaseRadioGroup=$1;"
            }
        },
    ],
    set ManaBaseRadioGroup(value: any) {
        ManaBaseRadioGroup = value;
    },
    settings,

    button(src: string) {
        return <button
            className={cl("button")}
            style={{ backgroundColor: "transparent" }}
            onClick={e => {
                e.stopPropagation();
                openModal(modalProps => <LanguageSelectionModal modalProps={modalProps} src={src} />);
            }}>
            <ChannelListIcon colorClass={cl("icon")} />
        </button>;
    },
});
