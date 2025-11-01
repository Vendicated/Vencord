import { ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";

export const audioHandler = {
    icon: "audio",

    getActivity(item) {
        const metadataProviders = item.ProviderIds;

        return {
            type: ActivityType.LISTENING,
            statusType: ActivityStatusDisplayType.STATE,
            details: item.Name,
            detailsURL: providers.MusicBrainzRecording ? `https://musicbrainz.org/recording/${providers.MusicBrainzRecording}` : undefined,
            state: item.Artists.join(", "),
            stateURL: providers.MusicBrainzArtist ? `https://musicbrainz.org/artist/${providers.MusicBrainzArtist}` : undefined,
            image: item.Album,
        };
    },

    async getImage(item) {
        const release = item.ProviderIds.MusicBrainzAlbum;

        if (release) {
            const data = await fetch(`https://coverartarchive.org/release/${release}`).then(response => response.json());

            for (const image of data.images) {
                if (image.front) {
                    return image.thumbnails.small;
                }
            }
        }

        return null;
    },
};

export default {
    Audio: audioHandler,
};
