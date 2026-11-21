/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, ErrorBoundary, Flex, FormSwitch, Paragraph, Span } from "@components/index";
import { classNameFactory } from "@utils/css";
import { saveFile } from "@utils/web";
import { RenderModalProps, User } from "@vencord/discord-types";
import { DisplayProfileUtils, IconUtils, Modal, openModal, Select, showToast, TabBar, TextInput, useEffect, useRef, useState } from "@webpack/common";

import { emptyOverride, getUserOverride, hasFlag, OverrideFlags, saveUserOverride, UserOverride, UserTag } from "./data";
import { exportImages, getImages, ImageChanges, ImageKind, imageTypes, importImages, saveImageChanges, UserImages, validateImage } from "./images";
import { ShopPicker } from "./shop";

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

function ColorField({ label, value, disabled, onChange }: {
    label: string;
    value: string;
    disabled: boolean;
    onChange(value: string): void;
}) {
    return (
        <Flex alignItems="center">
            <label className={cl("colourPicker")}>
                <Span>{label}</Span>
                <input
                    type="color"
                    value={`#${value.padStart(6, "0")}`}
                    disabled={disabled}
                    onChange={({ currentTarget }) => onChange(currentTarget.value.slice(1))}
                />
            </label>
            <Button variant="secondary" disabled={disabled || !value} onClick={() => onChange("")}>
                Reset Colour
            </Button>
        </Flex>
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
    const [error, setError] = useState<{ tab?: Tab; message: string; }>();

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
                    setError({ message: errorMessage(error) });
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
        setError(undefined);
        try {
            await validateImage(file);
            setChanges(changes => ({ ...changes, [kind]: file }));
            setField(kind === "avatar" ? "avatarUrl" : "bannerUrl", "");
        } catch (error) {
            setError({ tab: kind, message: errorMessage(error) });
        } finally {
            setBusy(false);
        }
    }

    async function save() {
        const next = { ...override };
        for (const key of ["username", "pronouns", "avatarUrl", "bannerUrl"] as const) {
            next[key] = next[key].trim();
        }

        for (const kind of ["avatar", "banner"] as const) {
            const key = kind === "avatar" ? "avatarUrl" : "bannerUrl";
            const url = next[key];
            if (url && url !== original.current[key] && !/^https?:\/\//i.test(url)) {
                setError({ tab: kind, message: "Image URLs must start with http:// or https://." });
                setTab(kind);
                return;
            }
        }

        setBusy(true);
        setError(undefined);
        try {
            if (Object.keys(changes).length) {
                await saveImageChanges(new Map([[user.id, changes]]));
            }

            saveUserOverride(user.id, next);
            modalProps.onClose();
            showToast({ text: "User edits saved.", variant: "success" });
        } catch (error) {
            setError({ message: errorMessage(error) });
        } finally {
            setBusy(false);
        }
    }

    function renderTab() {
        switch (tab) {
            case "name":
                return (
                    <>
                        <TextInput
                            aria-label="Display name"
                            placeholder={user.globalName || user.username}
                            value={override.username}
                            onChange={value => setField("username", value)}
                        />
                        <ColorField
                            label="Username Colour"
                            value={override.usernameColor}
                            disabled={busy}
                            onChange={value => setField("usernameColor", value)}
                        />
                        <FormSwitch
                            title="Override server role colours"
                            description="Use the custom username colour even when the user has a coloured role."
                            disabled={!override.usernameColor}
                            value={hasFlag(override.flags, OverrideFlags.OverrideRoleColor)}
                            onChange={value => toggleFlag(OverrideFlags.OverrideRoleColor, value)}
                        />
                    </>
                );
            case "avatar":
            case "banner": {
                const urlKey = tab === "avatar" ? "avatarUrl" : "bannerUrl";
                const useDefault = tab === "avatar" && hasFlag(override.flags, OverrideFlags.UseDefaultAvatar);
                const image = changes[tab] === null ? undefined : changes[tab] ?? images[tab];
                let placeholder: string | null | undefined;
                if (!original.current[urlKey]) {
                    placeholder = tab === "avatar"
                        ? user.getAvatarURL()
                        : DisplayProfileUtils.getDisplayProfile(user.id)?.getBannerURL({ canAnimate: true, size: 480 });
                }
                return (
                    <>
                        {useDefault ? (
                            <img
                                className={cl("preview", "avatar")}
                                src={IconUtils.getDefaultAvatarURL(user.id, user.discriminator)}
                                alt="Default avatar preview"
                            />
                        ) : (
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
                                    setError(undefined);
                                }}
                            />
                        )}
                        {tab === "avatar" ? (
                            <FormSwitch
                                title="Use Discord’s default avatar"
                                description="Show the default Discord avatar for this user in every server and DM."
                                disabled={busy}
                                value={useDefault}
                                onChange={value => {
                                    toggleFlag(OverrideFlags.UseDefaultAvatar, value);
                                    setError(undefined);
                                }}
                                hideBorder
                            />
                        ) : (
                            <ColorField
                                label="Banner Colour"
                                value={override.bannerColor}
                                disabled={busy}
                                onChange={value => setField("bannerColor", value)}
                            />
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
                        <ErrorBoundary noop={false}>
                            <ShopPicker
                                decoration={override.decoration}
                                profileEffect={override.profileEffect}
                                onSelect={setField}
                                onError={message => setError(message ? { tab: "profile", message } : undefined)}
                                busy={busy}
                                onBusy={setBusy}
                            />
                        </ErrorBoundary>
                        <div>
                            <Span>Message Tag</Span>
                            <Select
                                options={tagOptions}
                                serialize={String}
                                select={tag => setField("tag", tag)}
                                isSelected={tag => tag === override.tag}
                                placeholder="Message tag"
                                closeOnSelect
                            />
                        </div>
                    </>
                );
        }
    }

    const guildOption = tab === "profile" ? undefined : guildOptions[tab];
    const disableGuildOptions = tab === "avatar" && hasFlag(override.flags, OverrideFlags.UseDefaultAvatar);
    const notice = error && (!error.tab || error.tab === tab)
        ? { message: error.message, type: "critical", role: "alert" }
        : undefined;

    return (
        <Modal
            {...modalProps}
            title={`Edit User ${user.username}`}
            size="md"
            notice={notice}
            actions={[
                {
                    text: "Reset All",
                    variant: "critical-primary",
                    disabled: busy,
                    onClick: () => {
                        setOverride({ ...emptyOverride });
                        setChanges({ avatar: null, banner: null });
                        setError(undefined);
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
                            disabled={disableGuildOptions}
                            value={hasFlag(override.flags, guildOption[0])}
                            onChange={value => toggleFlag(guildOption[0], value)}
                        />
                        <FormSwitch
                            title={`Prefer server ${guildOption[2]} over the override`}
                            disabled={disableGuildOptions || hasFlag(override.flags, guildOption[0])}
                            value={hasFlag(override.flags, guildOption[1])}
                            onChange={value => toggleFlag(guildOption[1], value)}
                            hideBorder
                        />
                    </div>
                )}
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
            <Flex>
                <FileButton
                    label="Import Images"
                    accept=".json,application/json"
                    disabled={busy}
                    onSelect={file => run(async () => {
                        const count = await importImages(file);
                        showToast({ text: `Imported images for ${count} ${count === 1 ? "user" : "users"}.`, variant: "success" });
                    })}
                />
                <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => run(async () => saveFile(await exportImages()))}
                >
                    Export Images
                </Button>
            </Flex>
        </div>
    );
}
