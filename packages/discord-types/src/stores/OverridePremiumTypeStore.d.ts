import { FluxStore } from "..";

export interface OverridePremiumTypeState {
    createdAtOverride: Date | undefined;
    premiumTypeActual: number | null;
    premiumTypeOverride: number | undefined;
}

export class OverridePremiumTypeStore extends FluxStore {
    getState(): OverridePremiumTypeState;
    getCreatedAtOverride(): Date | undefined;
    getPremiumTypeActual(): number | null;
    getPremiumTypeOverride(): number | undefined;
    get premiumType(): number | undefined;
}
