import { FluxStore } from "..";

type State = {
    createdAtOverride: Date | undefined;
    premiumTypeActual: number;
    premiumTypeOverride: number | undefined;
};

export class OverridePremiumTypeStore extends FluxStore {
    getState(): State;
    getCreatedAtOverride(): Date;
    getPremiumTypeActual(): number;
    getPremiumTypeOverride(): number;
    get premiumType(): number;
}
