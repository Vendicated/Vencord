import { FluxStore } from "..";

export class OverridePremiumTypeStore extends FluxStore {
    getCreatedAtOverride(): Date;
    getPremiumTypeActual(): number;
    getPremiumTypeOverride(): number;
    get premiumType(): number;
}
