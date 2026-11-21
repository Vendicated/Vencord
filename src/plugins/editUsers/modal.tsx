/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, ErrorBoundary, Flex, FormSwitch, Paragraph, Span } from "@components/index";
import { classNameFactory } from "@utils/css";
import { saveFile } from "@utils/web";
import { RenderModalProps, User } from "@vencord/discord-types";
import { DisplayProfileUtils, Modal, openModal, Select, showToast, TabBar, TextInput, useEffect, useRef, useState } from "@webpack/common";

import { emptyOverride, getUserOverride, hasFlag, OverrideFlags, saveUserOverride, UserOverride, UserTag } from "./data";
import { exportImages, getImages, ImageChanges, ImageKind, imageTypes, importImages, saveImageChanges, UserImages, validateImage } from "./images";

const cl = classNameFactory("vc-editUsers-");

const tabs = [
    { id: "name", label: "Display Name" },
    { id: "avatar", label: "Avatar" },
    { id: "banner", label: "Banner" },
    { id: "profile", label: "Profile" },
] as const;

type Tab = typeof tabs[number]["id"];

const guildOptions = {
    name: [OverrideFlags.DisableNicks, OverrideFlags.PreferServerNicks, "nicknames"],
    avatar: [OverrideFlags.DisableServerAvatars, OverrideFlags.KeepServerAvatar, "avatars"],
    banner: [OverrideFlags.DisableServerBanners, OverrideFlags.KeepServerBanner, "banners"],
} as const;

const tagOptions = [
    { label: "Default", value: "" },
    { label: "App", value: "BOT" },
    { label: "Official", value: "OFFICIAL" },
    { label: "Server", value: "SERVER" },
    { label: "Original Poster", value: "ORIGINAL_POSTER" },
    { label: "Hide tag", value: "NONE" },
] satisfies { label: string; value: UserTag; }[];

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function FileButton({ label, accept, disabled, onSelect }: {
    label: string;
    accept: string;
    disabled?: boolean;
    onSelect(file: File): void;
}) {
    const input = useRef<HTMLInputElement>(null);
    return (
        <>
            <Button variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
                {label}
            </Button>
            <input
                ref={input}
                type="file"
                accept={accept}
                hidden
                onChange={({ currentTarget }) => {
                    const file = currentTarget.files?.[0];
                    currentTarget.value = "";
                    if (file) {
                        onSelect(file);
                    }
                }}
            />
        </>
    );
}

function ImageEditor({ kind, image, url, placeholder, onFile, onUrl, onReset, disabled }: {
    kind: ImageKind;
    image?: Blob;
    url: string;
    placeholder?: string;
    onFile(file: File): void;
    onUrl(url: string): void;
    onReset(): void;
    disabled: boolean;
}) {
    const [preview, setPreview] = useState<string>();
    useEffect(() => {
        if (!image) {
            setPreview(undefined);
            return;
        }
        const src = URL.createObjectURL(image);
        setPreview(src);
        return () => URL.revokeObjectURL(src);
    }, [image]);

    const src = image ? preview : url.trim() || placeholder;
    return (
        <>
            {src && <img src={src} className={cl("preview", kind)} alt={`${kind} preview`} />}
            <Flex>
                <FileButton label="Choose Image" accept={imageTypes} disabled={disabled} onSelect={onFile} />
                <Button variant="secondary" disabled={disabled || (!image && !url)} onClick={onReset}>
                    Reset Image
                </Button>
            </Flex>
            <TextInput
                aria-label={`${kind} image URL`}
                placeholder={`Optional ${kind} URL`}
                value={url}
                disabled={disabled || Boolean(image)}
                onChange={onUrl}
            />
        </>
    );
}

function EditModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
    const original = useRef(getUserOverride(user.id));
    const [override, setOverride] = useState(() => ({ ...emptyOverride, ...original.current }));
    const [tab, setTab] = useState<Tab>("name");
    const [images, setImages] = useState<UserImages>({});
    const [changes, setChanges] = useState<ImageChanges>({});
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let closed = false;
        getImages(user.id)
            .then(saved => {
                if (!closed) {
                    setImages(saved ?? {});
                }
            })
            .catch(error => {
                if (!closed) {
                    setError(errorMessage(error));
                }
            })
            .finally(() => {
                if (!closed) {
                    setBusy(false);
                }
            });

        return () => { closed = true; };
    }, [user.id]);

    const setField = <K extends keyof UserOverride,>(key: K, value: UserOverride[K]) =>
        setOverride(override => ({ ...override, [key]: value }));

    function toggleFlag(flag: OverrideFlags, enabled: boolean) {
        setOverride(override => ({
            ...override,
            flags: enabled ? override.flags | flag : override.flags & ~flag
        }));
    }

    async function selectImage(kind: ImageKind, file: File) {
        setBusy(true);
        setError("");
        try {
            await validateImage(file);
            setChanges(changes => ({ ...changes, [kind]: file }));
            setField(kind === "avatar" ? "avatarUrl" : "bannerUrl", "");
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    async function save() {
        setBusy(true);
        setError("");
        try {
            const next = { ...override };
            for (const key of ["username", "pronouns", "avatarUrl", "bannerUrl", "decoration", "profileEffect"] as const) {
                next[key] = next[key].trim();
            }

            for (const key of ["avatarUrl", "bannerUrl"] as const) {
                const url = next[key];
                if (url && url !== original.current[key] && !/^https?:\/\//i.test(url)) {
                    throw new Error("Image URLs must start with http:// or https://.");
                }
            }
            if (next.decoration && !/^(?:a_)?[a-f0-9]{32}$/i.test(next.decoration)) {
                throw new Error("Enter a Discord avatar decoration asset hash.");
            }
            if (next.profileEffect && !/^\d{17,20}$/.test(next.profileEffect)) {
                throw new Error("Enter a Discord profile effect SKU ID.");
            }
            if (Object.keys(changes).length) {
                await saveImageChanges(new Map([[user.id, changes]]));
            }

            saveUserOverride(user.id, next);
            modalProps.onClose();
            showToast({ text: "User edits saved.", variant: "success" });
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    function renderTab() {
        switch (tab) {
            case "name":
                return (
                    <TextInput
                        aria-label="Display name"
                        placeholder={user.globalName || user.username}
                        value={override.username}
                        onChange={value => setField("username", value)}
                    />
                );
            case "avatar":
            case "banner": {
                const urlKey = tab === "avatar" ? "avatarUrl" : "bannerUrl";
                const image = changes[tab] === null ? undefined : changes[tab] ?? images[tab];
                let placeholder: string | null | undefined;
                if (!original.current[urlKey]) {
                    placeholder = tab === "avatar"
                        ? user.getAvatarURL()
                        : DisplayProfileUtils.getDisplayProfile(user.id)?.getBannerURL({ canAnimate: true, size: 480 });
                }
                return (
                    <>
                        <ImageEditor
                            kind={tab}
                            image={image}
                            url={override[urlKey]}
                            placeholder={placeholder ?? undefined}
                            disabled={busy}
                            onFile={file => selectImage(tab, file)}
                            onUrl={value => setField(urlKey, value)}
                            onReset={() => {
                                setChanges(changes => ({ ...changes, [tab]: null }));
                                setField(urlKey, "");
                            }}
                        />
                        {tab === "banner" && (
                            <Flex alignItems="center">
                                <label className={cl("colourPicker")}>
                                    <Span>Banner Colour</Span>
                                    <input
                                        type="color"
                                        value={`#${override.bannerColor.padStart(6, "0")}`}
                                        disabled={busy}
                                        onChange={({ currentTarget }) => setField("bannerColor", currentTarget.value.slice(1))}
                                    />
                                </label>
                                <Button
                                    variant="secondary"
                                    disabled={busy || !override.bannerColor}
                                    onClick={() => setField("bannerColor", "")}
                                >
                                    Reset Colour
                                </Button>
                            </Flex>
                        )}
                    </>
                );
            }
            case "profile":
                return (
                    <>
                        <label>
                            <Span>Pronouns</Span>
                            <TextInput value={override.pronouns} onChange={value => setField("pronouns", value)} />
                        </label>
                        <label>
                            <Span>Avatar Decoration Asset Hash</Span>
                            <TextInput value={override.decoration} onChange={value => setField("decoration", value)} />
                        </label>
                        <label>
                            <Span>Profile Effect SKU ID</Span>
                            <TextInput value={override.profileEffect} onChange={value => setField("profileEffect", value)} />
                        </label>
                        <Select
                            options={tagOptions}
                            serialize={String}
                            select={tag => setField("tag", tag)}
                            isSelected={tag => tag === override.tag}
                            placeholder="Message tag"
                            closeOnSelect
                        />
                    </>
                );
        }
    }

    const guildOption = tab === "profile" ? undefined : guildOptions[tab];

    return (
        <Modal
            {...modalProps}
            title={`Edit User ${user.username}`}
            size="md"
            actions={[
                {
                    text: "Reset All",
                    variant: "critical-primary",
                    disabled: busy,
                    onClick: () => {
                        setOverride({ ...emptyOverride });
                        setChanges({ avatar: null, banner: null });
                    }
                },
                {
                    text: "Save",
                    variant: "primary",
                    disabled: busy,
                    onClick: save
                }
            ]}
        >
            <div className={cl("modal")}>
                <TabBar
                    type="top"
                    look="brand"
                    className={cl("tabBar")}
                    selectedItem={tab}
                    onItemSelect={setTab}
                >
                    {tabs.map(({ id, label }) => (
                        <TabBar.Item id={id} key={id} className={cl("tab")}>
                            {label}
                        </TabBar.Item>
                    ))}
                </TabBar>
                {renderTab()}
                {guildOption && (
                    <div>
                        <FormSwitch
                            title={`Hide server ${guildOption[2]}`}
                            value={hasFlag(override.flags, guildOption[0])}
                            onChange={value => toggleFlag(guildOption[0], value)}
                        />
                        <FormSwitch
                            title={`Prefer server ${guildOption[2]} over the override`}
                            disabled={hasFlag(override.flags, guildOption[0])}
                            value={hasFlag(override.flags, guildOption[1])}
                            onChange={value => toggleFlag(guildOption[1], value)}
                            hideBorder
                        />
                    </div>
                )}
                {error && <Paragraph role="alert">{error}</Paragraph>}
            </div>
        </Modal>
    );
}

const SafeEditModal = ErrorBoundary.wrap(EditModal, { noop: false });

export function openUserEditModal(user: User) {
    openModal(modalProps => <SafeEditModal user={user} modalProps={modalProps} />);
}

export function ImageBackup() {
    const [busy, setBusy] = useState(false);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        try {
            await action();
        } catch (error) {
            showToast({ text: errorMessage(error), variant: "critical" });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={cl("backup")}>
            <Paragraph>Back up local avatars and banners. Import replaces matching images by user ID.</Paragraph>
            {(["avatar", "banner"] as const).map(kind => (
                <Flex key={kind}>
                    <FileButton
                        label={`Import ${kind}s`}
                        accept=".json,application/json"
                        disabled={busy}
                        onSelect={file => run(async () => {
                            const count = await importImages(file, kind);
                            showToast({ text: `Imported ${count} ${kind}${count === 1 ? "" : "s"}.`, variant: "success" });
                        })}
                    />
                    <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => run(async () => saveFile(await exportImages(kind)))}
                    >
                        Export {kind}s
                    </Button>
                </Flex>
            ))}
        </div>
    );
}
