import { FluxStore } from "..";

export interface GradientPreset {
    id: number;
    [key: string]: unknown;
}

export class ClientThemesBackgroundStore extends FluxStore {
    get gradientPreset(): GradientPreset | undefined;
    get isPreview(): boolean;
    get isCoachmark(): boolean;
    get mobilePendingThemeIndex(): number | undefined;
    get hasHiddenHexagonCampaignPreset(): boolean;
    getLinearGradient(): string | null;
}
