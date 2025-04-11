import GoPlayApi from './goplayapi.js';
import { parse } from 'mpd-parser';
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

    _toCatalog(program) {
        const self = this;
        return  {
            id: idPrefix + program.programUuid,
            name: `${program.title}`,
            description: `${program.description}`,
		    type: self._getType(program),
		    poster: element.images.portrait[0].url || null,
            genres: [element.category],
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
            description: `${program.description}\n\n${websiteurl}${program.link}`,
            background: program.images.landscape[0].url || null,
            runtime: `🕗 ${self._formatTime(video.duration * 1000)}`
        }
    }

    async getTopPrograms() {
        const self = this;
        return await self.api.getTopPickPrograms()
            .then((r) => r.map((e) => this._toCatalog(e)));
    }

    async getPopularPrograms() {
        const self = this;
        return await self.api.getMostPopularPrograms()
            .then((r) => r.map((e) => this._toCatalog(e)));
    }

    async getMyPrograms() {
        const self = this;
        return await self.api.getMyListPrograms()
            .then((r) => r.map((e) => this._toCatalog(e)));
    }

    async parallel(arr, fn, threads = 2) {
        const result = [];
        while (arr.length) {
          const res = await Promise.all(arr.splice(0, threads).map(x => fn(x)));
          result.push(res);
        }
        return result.flat();
    }

    async getAllPrograms(skip) {
        const self = this;
        const page = 'programs';
        return self.api.getPage(page)
            .then((r) => r.lanes)
            .then((r) => Promise.all(r.map(lane => self.api.getSwimLane(page, lane.index))))
            .then((r) => r.map(element => element.cards))
            .then((r) => r.flat())
            .then((r) => self.parallel(r.map(card => card.uuid), element => self.api.getProgram(element), 4))
            .then((r) => r.map(element => this._toCatalog(element)));
    }

    async getStream(video) {
        if (video.adType == 'SSAI' && video.ssai) {
            const url = `${ondemandurl}/${video.ssai.contentSourceID}/vid/${video.ssai.videoID}/streams`;
            const json = await fetch(url, {method: 'POST'}).then((r) => r.json());
            const manifestUri = json.stream_manifest;
            const manifest = await fetch(manifestUri).then((r) => r.text());
            const mpd = parse(manifest, {manifestUri});
            return {
                url: manifestUri,
            }
        }
    }

    async getVideo(id) {
        const self = this;
        const programUuid = id.replace(idPrefix, '');
        const program = await self.api.getProgram(programUuid);
        const video = await self.api.getVideoLongForm(program.nextVideo);
        return self.getStream(video);
    }

    // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
    _formatTime(ms) {
        const seconds = Math.floor(Math.abs(ms / 1000))
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.round(seconds % 60)
        const t = [h, m > 9 ? m : h ? '0' + m : m || '0', s > 9 ? s : '0' + s]
          .filter(Boolean)
          .join(':')
        return ms < 0 && seconds ? `-${t}` : t
      }

    async getMeta(id) {
        const self = this;
        const programUuid = id.replace(idPrefix, '');
        const program = await self.api.getProgram(programUuid);
        console.log(program);
        const video = await self.api.getVideoLongForm(program.nextVideo);
        console.log(video);
        return self._toMeta(program, video);
    }
}