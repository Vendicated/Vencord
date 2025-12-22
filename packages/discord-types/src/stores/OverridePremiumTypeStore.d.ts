import { FluxStore } from "..";

type State = {
    createdAtOverride: Date | undefined;
    premiumTypeActual: number;
    premiumTypeOverride: number | undefined;
};

export class OverridePremiumTypeStore extends FluxStore {
    getState(): State;
    getCreatedAtOverride(): Date | undefined;
    getPremiumTypeActual(): number;
    getPremiumTypeOverride(): number | undefined;
    get premiumType(): number;
}
