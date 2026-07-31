import decorationsData from "./decorations.json";
import { getProfile } from "./settings";

const DECOR_CDN = "https://cdn.discordapp.com/avatar-decoration-presets";

export interface DecorationPreset {
    id: string;
    name: string;
    asset: string;
    collection: string;
    skuId?: string;
}

/** All known Discord avatar decoration presets (130+ from shop archive) */
export const DECORATION_PRESETS: DecorationPreset[] =
    decorationsData as DecorationPreset[];

export const DECORATION_COLLECTIONS = [
    ...new Set(DECORATION_PRESETS.map((p) => p.collection).filter(Boolean)),
].sort();

/** Fake SKU id — asset field is the decoration hash (a_xxx…), URL built at resolve time */
export const CUSTOM_DECORATION_SKU = "888888888888888";

export function getDecorationCdnUrl(
    asset: string,
    size = 160,
    canAnimate = true,
): string {
    if (!asset) return "";
    const params = new URLSearchParams({ size: String(size) });
    if (!canAnimate) params.set("passthrough", "false");
    return `${DECOR_CDN}/${asset}.png?${params.toString()}`;
}

function normalizeDecorationAsset(asset: string): string {
    return asset.replace(/^a_/, "");
}

function decorationAssetsMatch(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return (
        a === b || normalizeDecorationAsset(a) === normalizeDecorationAsset(b)
    );
}

function extractDecorationFields(
    avatarDecoration?: string | { asset?: string; skuId?: string } | null,
): { asset?: string; skuId?: string } {
    if (!avatarDecoration) return {};
    if (typeof avatarDecoration === "string")
        return { asset: avatarDecoration };
    return { asset: avatarDecoration.asset, skuId: avatarDecoration.skuId };
}

function assetMatchesOurs(incoming?: string | null, ourHash?: string): boolean {
    if (!incoming || !ourHash) return false;
    if (decorationAssetsMatch(incoming, ourHash)) return true;
    if (
        incoming.startsWith("http") &&
        incoming.includes(normalizeDecorationAsset(ourHash))
    )
        return true;
    return false;
}

export type AvatarDecorationUrlInput =
    | {
          avatarDecoration?: string | { asset?: string; skuId?: string } | null;
          size?: number;
          canAnimate?: boolean;
          canCanimate?: boolean;
      }
    | null
    | undefined;

/** Resolve CDN URL for custom profile decorations (MediaResolver / IconUtils hook). */
export function resolveCustomProfileDecorationURL(
    data: AvatarDecorationUrlInput,
): string | undefined {
    if (!data) return undefined;

    const profile = getProfile();
    if (!profile.avatarDecorationOverride) return undefined;

    const ourHash = profile.avatarDecoration.trim();
    const canAnimate = data.canAnimate ?? data.canCanimate ?? true;
    const size = data.size ?? 160;

    if (!ourHash) return "";

    const { asset: incomingAsset, skuId } = extractDecorationFields(
        data.avatarDecoration,
    );

    if (skuId === CUSTOM_DECORATION_SKU) {
        return getDecorationCdnUrl(ourHash, size, canAnimate);
    }

    if (assetMatchesOurs(incomingAsset, ourHash)) {
        return getDecorationCdnUrl(ourHash, size, canAnimate);
    }

    return undefined;
}

export function buildCustomAvatarDecoration(assetHash: string): {
    asset: string;
    skuId: string;
    expires_at: null;
} {
    return {
        asset: assetHash,
        skuId: CUSTOM_DECORATION_SKU,
        expires_at: null,
    };
}

export function getDecorationPreviewUrl(asset: string): string {
    if (!asset) return "";
    return getDecorationCdnUrl(asset, 80, false);
}

export function getDecorationPresetPreview(preset: DecorationPreset): string {
    return getDecorationPreviewUrl(preset.asset);
}

export function filterDecorations(
    query: string,
    collection: string,
): DecorationPreset[] {
    const q = query.trim().toLowerCase();
    return DECORATION_PRESETS.filter((preset) => {
        if (preset.id === "none") return false;
        if (collection && preset.collection !== collection) return false;
        if (!q) return true;
        return (
            preset.name.toLowerCase().includes(q) ||
            preset.collection.toLowerCase().includes(q) ||
            preset.asset.toLowerCase().includes(q)
        );
    });
}
