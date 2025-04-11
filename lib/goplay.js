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

    _getType(program) {
        var type = program.type.toLowerCase();
        if (type == 'default') {
            return 'tv';
        }
        return type;
    }

    _toMetaPreview(program) {
        const self = this;
        return  {
            id: idPrefix + program.programUuid,
            name: `${program.title}`,
            description: `${program.description}`,
		    type: self._getType(program),
		    poster: program.images.portrait[0].url || null,
            genres: [program.category],
            website: `${websiteurl}${program.link}`
        }
    }

    _toMeta(program, video) {
        const self = this;
        return {
            id: idPrefix + program.programUuid,
            type: self._getType(program),
            name: program.title,
            poster: program.images.portrait[0].url || null,
            genres: [program.category],
            description: `${program.description}`,
            background: (program.images.landscape[0] || program.images.portrait[0] || {}).url || null,
            runtime: `🕗 ${formatTime((video.duration || 0) * 1000)}${video.flags.isDrm ? ' 🔒 Drm' : ''} 🎂 ${program.parentalRating}`,
            website: `${websiteurl}${program.link}`
        }
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

    async getAllPrograms(type, skip) {
        const self = this;
        const page = 'programs';
        return self.api.getPage(page)
            .then((r) => { console.log(r); return r.lanes; })
            .then((r) => Promise.all(r.map(lane => self.api.getSwimLane(page, lane.index))))
            .then((r) => { console.log(r); return r.map(element => element.cards); })
            .then((r) => r.flat())
            // Throttle this
            .then((r) => parallel(r.map(card => card.uuid), element => self.api.getProgram(element), 4))
            .then((r) => r.map(element => self._toMetaPreview(element)));
    }

    async getStream(video) {
        // TODO: DRM?
        if (video.drXml) {
        }

        if (video.manifestUrls) {
            return Promise.resolve({ url: video.manifestUrls.dash || video.manifestUrls.hls});
        }

        if (video.adType == 'SSAI' && video.ssai) {
            const url = `${ondemandurl}/${video.ssai.contentSourceID}/vid/${video.ssai.videoID}/streams`;
            const json = await fetch(url, {method: 'POST'}).then((r) => r.json());
            const manifestUri = json.stream_manifest;
            return Promise.resolve({ url: manifestUri });
        }
    }

    _getGuidFromId(id) {
        return id.replace(idPrefix, '');
    }

    async getVideo(id) {
        const self = this;
        const program = await self.api.getProgram(self._getGuidFromId(id));
        const video = await self.api.getVideoLongForm(program.nextVideo);
        return self.getStream(video);
    }   

    async getMeta(id) {
        const self = this;
        const program = await self.api.getProgram(self._getGuidFromId(id));
        const video = program.nextVideo ? await self.api.getVideoLongForm(program.nextVideo) : {};
        return Promise.resolve(self._toMeta(program, video));
    }
}