import { User } from "./User";

export interface Application {
    id: string;
    name: string;
    description?: string | null;
    type: number | null;
    icon: string | null | undefined;
    is_discoverable: boolean;
    is_monetized: boolean;
    is_verified: boolean;
    bot?: User;
    deeplink_uri?: string;
    flags?: number;
    privacy_policy_url?: string;
    terms_of_service_url?: string;
    install_params?: ApplicationInstallParams;
}

export interface ApplicationInstallParams {
    permissions: string | null;
    scopes: string[];
}
