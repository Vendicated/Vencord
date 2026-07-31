import { copyWithToast } from "@utils/discord";

import { getProfile } from "./settings";

export function encodeProfileTheme3y3(primary: number, accent: number): string {
    const message = `[#${primary.toString(16).padStart(6, "0")},#${accent.toString(16).padStart(6, "0")}]`;
    const encoded = Array.from(message)
        .map((x) => x.codePointAt(0))
        .filter((x) => x! >= 0x20 && x! <= 0x7f)
        .map((x) => String.fromCodePoint(x! + 0xe0000))
        .join("");

    return " " + encoded;
}

export function decodeProfileTheme3y3(
    bio: string | null | undefined,
): [number, number] | null {
    if (bio == null) return null;

    const colorString = bio.match(
        /\u{e005b}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e002c}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e005d}/u,
    );
    if (colorString == null) return null;

    const parsed = [...colorString[0]]
        .map((x) => String.fromCodePoint(x.codePointAt(0)! - 0xe0000))
        .join("");
    const colors = parsed
        .substring(1, parsed.length - 1)
        .split(",")
        .map((x) => parseInt(x.replace("#", "0x"), 16));

    return colors.length === 2 ? [colors[0], colors[1]] : null;
}

export function copyProfileTheme3y3(primary: number, accent: number) {
    copyWithToast(encodeProfileTheme3y3(primary, accent));
}

export const DEFAULT_PROFILE_THEME_PRIMARY = 0x5865f2;
export const DEFAULT_PROFILE_THEME_ACCENT = 0xffffff;

export function getProfileThemeColors(): [number, number] | null {
    const profile = getProfile();
    if (!profile.useProfileTheme) return null;
    return [profile.profileThemePrimary, profile.profileThemeAccent];
}
