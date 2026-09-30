import { FluxStore } from "..";
import { StandingState } from "../../enums";

export interface AccountStanding {
    state: StandingState;
}

export interface SafetyHubClassification {
    id: string;
    [key: string]: unknown;
}

export type ClassificationRequestState = 0 | 1 | 2;

export type AgeCheckStatus = "loading" | "error" | "success" | "failure" | "none" | "verified" | "verified_other_violations_remain" | "underage" | "underage_manual_review";

export class SafetyHubStore extends FluxStore {
    getAccountStanding(): AccountStanding;
    isInitialized(): boolean;
    isFetching(): boolean;
    getFetchError(): unknown;
    getClassifications(): SafetyHubClassification[];
    getClassification(classificationId: string): SafetyHubClassification | undefined;
    getClassificationRequestState(classificationId: string): ClassificationRequestState | undefined;

    getAppealClassificationId(): string | null;
    getIsDsaEligible(): boolean;
    getIsAppealEligible(): boolean;
    getAppealEligibility(): unknown[];
    getAppealSignal(): number;
    getFreeTextAppealReason(): string;
    getIsSubmitting(): boolean;
    getSubmitError(): unknown;
    getIsExpressiveModalV2Enabled(): boolean;
    getShowExpressiveModalSubtitleAlt(): boolean;
    getIsManualReviewFallbackEnabled(): boolean;
    getIsManualReviewDecidedUnderage(): boolean;
    getUsername(): string;

    getAgeVerificationWebviewUrl(): string;
    getAgeVerificationError(): unknown;
    getIsLoadingAgeVerification(): boolean;
    getAgeCheckStatus(): AgeCheckStatus;
    getAgeCheckError(): unknown;
    getAgeCheckAttempts(): number;
}
