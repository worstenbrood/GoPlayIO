import GoPlayApi from './goplayapi.js';
import { formatTime, parallel } from './tools.js';

export const idPrefix = 'gp-';
const ondemandurl = 'https://pubads.g.doubleclick.net/ondemand/dash/content';
const websiteurl = 'https://www.goplay.be';
export class GoPlay {
    constructor(email, password) {
        const self = this;
        self.api = new GoPlayApi(email, password);
    }

    _getType(s) {
        var type = s.toLowerCase();
        switch(type) {
            case 'default':
            case 'serie':
                return 'series';
            default:
                return type;
        }
    }

    _toMetaPreview(program) {
        const self = this;
        return {
            id: idPrefix + program.programUuid,
            name: `${program.title}`,
            description: `${program.description}`,
		    type: self._getType(program.type),
		    poster: program.images.portrait[0].url || null,
            genres: [program.category],
            website: `${websiteurl}${program.link}`
        }
    }

    _toLivestreamMetaPreview(livestream) {
        return {
            id: idPrefix + livestream.uuid,
            title: livestream.title,
            description: livestream.description,
            type: 'tv',
            poster: livestream.images[0].url,
            website: websiteurl
        }
    }

    _getBackground(images) {
        if (images.background) {
            return images.background;
        }
        if (images.landscape && images.landscape.length > 0) {
            return images.landscape[0].url;
        }
        if (images.portrait && images.portrait.length > 0) {
            return images.portrait[0].url;
        }
        return null;
    }

    async _toVideo(episode) {
        const self = this;
        console.log(episode);
        const video = await self.api.getVideoLongForm(episode.videoUuid).catch() || {};
        let result = {
            id: idPrefix + episode.videoUuid,
            title: video.subtitle || episode.title,
            overview: episode.description,
            thumbnail: images.portrait[0].url || null,
            season: video.seasonNumber || 0,
            episode: video.episodeNumber || episode.index
        };

        if (episode.dates && episode.dates.publishDate) {
            result.released = new Date(episode.dates.publishDate * 1000).toISOString();
        }

        return Promise.resolve(result);
    }

    async _toMeta(program, type) {
        const self = this;
        let meta = {
            id: idPrefix + program.programUuid,
            type: self._getType(program.type),
            name: program.title,
            poster: program.images.portrait[0].url || null,
            genres: [program.category],
            description: `${program.description}`,
            background: self._getBackground(program.images),
            website: `${websiteurl}${program.link}`
        };

        switch(type) {
            case 'movie':
                const video = await self.api.getVideoLongForm(program.nextVideo);
                meta.runtime = `🕗 ${formatTime((video.duration || 0) * 1000)}${video.flags.isDrm ? ' 🔒 Drm' : ''} 🎂 ${program.parentalRating}`;
                break;
            case 'series':
                const videos = await Promise.all(program.playlists
                        .map(async playlist => await self.api.getEpisodes(playlist.playlistUuid)))
                    .then((r) => r.flat())
                    .then((r) => r.map(element => element.videos))
                    .then((r) => r.flat())
                    .then((r) => parallel(r, element => self._toVideo(element), 4));
                meta.videos = videos;
                break;
        }

        return Promise.resolve(meta);
    }   

    async getTopPrograms() {
        const self = this;
        return await self.api.getTopPickPrograms()
            .then((r) => r.map((e) => self._toMetaPreview(e)));
    }

    async getPopularPrograms() {
        const self = this;
        return await self.api.getMostPopularPrograms()
            .then((r) => r.map((e) => self._toMetaPreview(e)));
    }

    async getMyPrograms() {
        const self = this;
        return await self.api.getMyListPrograms()
            .then((r) => r.map((e) => self._toMetaPreview(e)));
    }

    async getLivestreams() {
        const self = this;
        return self.api.getLiveStreams()
                .then((r) => r.map((livestream) => self._toLivestreamMetaPreview(livestream)));
    }

    async getCatalog(type, skip) {
        const self = this;
        if (type == 'tv') {
            return self.getLivestreams()
        }
        const page = 'programs';     
        return self.api.getPage(page)
            .then((r) => r.lanes)
            .then((r) => Promise.all(r.map(lane => self.api.getSwimLane(page, lane.index))))
            .then((r) => r.map(element => element.cards))
            .then((r) => r.flat())
            // Throttle this
            .then((r) => parallel(r.map(card => card.uuid), uuid => self.api.getProgramWeb(uuid), 4))
            .then((r) => r.filter(program => self._getType(program.type) == type).map(program => self._toMetaPreview(program)));
    }

    async getStream(video) {
        // TODO: DRM?
        if (video.drXml) {
        }

        let url = null;
        if (video.manifestUrls) {
            url = video.manifestUrls.dash || video.manifestUrls.hls;
        }
        else if (video.adType == 'SSAI' && video.ssai) {
            const streamurl = `${ondemandurl}/${video.ssai.contentSourceID}/vid/${video.ssai.videoID}/streams`;
            const json = await fetch(streamurl, {method: 'POST'}).then((r) => r.json());
            url = json.stream_manifest;
        }

        return Promise.resolve({ 
            url: url, 
            name: `${video.brand}`,
            description: `${video.title}` 
        });
    }

    _getGuidFromId(id) {
        return id.replace(idPrefix, '');
    }

    async getVideo(id, type) {
        const self = this;
        let video = null;
        switch(type) {
            case 'movie':
                const program = await self.api.getProgramWeb(self._getGuidFromId(id));
                video = await self.api.getVideoLongForm(program.nextVideo);
                break;
            case 'series':
                video = await self.api.getVideoLongForm(self._getGuidFromId(id)).catch();
                break;
        }

        if (!video) {
            return Promise.resolve({});
        }

        return self.getStream(video);
    }   

    async getMeta(id, type) {
        const self = this;
        const program = await self.api.getProgramTv(self._getGuidFromId(id));
        return self._toMeta(program, type);
    }

    async search(query, type) {
        const self = this;
        return self.api.search(query)
            .then((r) => parallel(r.cards.map(card => card.uuid), uuid => self.api.getProgramWeb(uuid), 4))
            .then((r) => r.filter(program => self._getType(program.type) == type).map(program => self._toMetaPreview(program)));
    }
}