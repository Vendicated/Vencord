import { ActivityStatusDisplayType, ActivityType } from "@vencord/discord-types/enums";

export const audioHandler = {
    icon: "audio",

    getActivity(item) {
        const providers = item.ProviderIds;

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

export const movieHandler = {
    icon: "movie",

    getActivity(item) {
        return {
            type: ActivityType.WATCHING,
            statusType: ActivityStatusDisplayType.DETAILS,
            details: item.Name,
            detailsURL: item.ExternalUrls[0]?.Url,
            state: item.ProductionYear,
        };
    },

    async getImage(item, settings) {
        if (settings.store.tmdbAPIKey) {
            const tmdb = item.ProviderIds.Tmdb;
            if (tmdb) {
                const details = await fetch(`https://api.themoviedb.org/3/movie/${tmdb}?api_key=${settings.store.tmdbAPIKey}`).then(response => response.json());
                return "http://image.tmdb.org/t/p/w500" + details.poster_path;
            }
        }

        return null;
    },
};

export default {
    Audio: audioHandler,
    Movie: movieHandler,
};
