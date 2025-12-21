import { FluxStore } from "..";

type State = {
    createdAtOverride: Date;
    premiumTypeActual: number;
    premiumTypeOverride: number;
};

export class OverridePremiumTypeStore extends FluxStore {
    getState(): State;
    getCreatedAtOverride(): Date;
    getPremiumTypeActual(): number;
    getPremiumTypeOverride(): number;
    get premiumType(): number;
}
