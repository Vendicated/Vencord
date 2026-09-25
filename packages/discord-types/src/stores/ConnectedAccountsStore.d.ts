import { ConnectedAccount, FluxStore } from "..";

export class ConnectedAccountsStore extends FluxStore {
    getAccounts(): ConnectedAccount[];
    getLocalAccounts(): ConnectedAccount[];
    getAccount(accountId: string | null | undefined, type: string): ConnectedAccount | undefined;
    getLocalAccount(type: string): ConnectedAccount | undefined;
    isFetching(): boolean;
    isJoining(integrationId: string): boolean;
    joinErrorMessage(integrationId: string): string | undefined;
    isSuggestedAccountType(type: string): boolean;
    addPendingAuthorizedState(state: string): void;
    deletePendingAuthorizedState(state: string): void;
    hasPendingAuthorizedState(state: string): boolean;
}
