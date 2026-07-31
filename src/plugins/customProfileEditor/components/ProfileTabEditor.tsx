import { classNameFactory } from "@utils/css";
import { Forms, Switch, TextInput } from "@webpack/common";

import type { CustomProfileData } from "../settings";
import { ProfileMediaField } from "./ProfileMediaField";

const cl = classNameFactory("vc-custom-profile-");

interface ProfileTabEditorProps {
    draft: CustomProfileData;
    onChange: (partial: Partial<CustomProfileData>) => void;
}

export function ProfileTabEditor({ draft, onChange }: ProfileTabEditorProps) {
    return (
        <>
            <ProfileMediaField
                label="Profile Picture"
                value={draft.customProfilePicture}
                placeholder="Image URL..."
                onChange={(customProfilePicture) =>
                    onChange({ customProfilePicture })
                }
                previewShape="circle"
            />

            <div className={cl("nitro-card")}>
                <Switch
                    note="Enables banner and profile color"
                    value={draft.simulateNitro}
                    onChange={(simulateNitro) => onChange({ simulateNitro })}
                >
                    Simulate Nitro
                </Switch>
            </div>

            {draft.simulateNitro && (
                <ProfileMediaField
                    label="Banner"
                    value={draft.customBanner}
                    placeholder="Image URL..."
                    onChange={(customBanner) => onChange({ customBanner })}
                    previewShape="rounded"
                />
            )}

            <div className={cl("input-row")}>
                <Forms.FormTitle tag="h5">Bio</Forms.FormTitle>
                <TextInput
                    value={draft.customBio}
                    onChange={(customBio) => onChange({ customBio })}
                    placeholder="My description..."
                />
            </div>

            <div className={cl("input-row")}>
                <Forms.FormTitle tag="h5">Pronouns</Forms.FormTitle>
                <TextInput
                    value={draft.customPronouns}
                    onChange={(customPronouns) => onChange({ customPronouns })}
                    placeholder="he/him"
                />
            </div>
        </>
    );
}
