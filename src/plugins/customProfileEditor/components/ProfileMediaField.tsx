import { classNameFactory } from "@utils/css";
import { Button, Forms, TextInput, useRef } from "@webpack/common";

const cl = classNameFactory("vc-custom-profile-");

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

interface ProfileMediaFieldProps {
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    previewShape?: "circle" | "rounded";
}

export function ProfileMediaField({
    label,
    value,
    placeholder,
    onChange,
    previewShape = "rounded",
}: ProfileMediaFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileSelected = async (file: File | null) => {
        if (!file || !file.type.startsWith("image/")) return;
        try {
            onChange(await readFileAsDataUrl(file));
        } catch {
            // ignore read errors
        }
    };

    return (
        <div className={cl("media-field")}>
            <Forms.FormTitle tag="h5">{label}</Forms.FormTitle>
            <div className={cl("media-row")}>
                <TextInput
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                />
                <Button
                    size={Button.Sizes.SMALL}
                    className={cl("media-upload")}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={`Upload ${label.toLowerCase()}`}
                >
                    📁
                </Button>
                {value.trim() && (
                    <>
                        <img
                            className={cl(
                                previewShape === "circle"
                                    ? "media-preview-circle"
                                    : "media-preview-banner",
                            )}
                            src={value.trim()}
                            alt=""
                            draggable={false}
                        />
                        <Button
                            look={Button.Looks.BLANK}
                            size={Button.Sizes.TINY}
                            className={cl("media-clear")}
                            onClick={() => onChange("")}
                            aria-label={`Clear ${label.toLowerCase()}`}
                        >
                            ✕
                        </Button>
                    </>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                        void onFileSelected(e.currentTarget.files?.[0] ?? null);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
        </div>
    );
}
