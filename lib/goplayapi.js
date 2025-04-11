import GoPlayAuth from './goplayauth.js';

const baseurl = 'https://api.goplay.be';
const web_v1 = '/web/v1';
const tv_v1 = '/tv/v1';
const tv_v2 = '/tv/v2';

export default class GoPlayApi {
    constructor(email, password, endpoint) {
        const self = this;
        self.baseurl = endpoint || baseurl;
        self.auth = new GoPlayAuth(email, password);
    }      

    async _fetchapi(path, options) {
        const self = this;
        options = options || {};
        options.headers = options.headers || {};
        options.headers['Accept'] = 'application/json';
        options.headers['Connection'] = 'keep-alive';

        const url = self.baseurl + path;
        return fetch(url, options)
            .then((result) => {
                if (!result.ok) {
                    return result.json()
                        .then((json) => new Promise((resolve, reject) => reject(`Status ${result.status} (${result.url}): ${json.message}`)));
                }
                return result;
            });
    }

    async _fetchAuth(path, options) {
        const self = this;
        options = options || {};
        options.headers = options.headers || {};
        return self.auth.getToken()
            .then((token) => {
                // Set authentication
                options.headers['Authorization'] = 'Bearer ' + token;       
                // Fetch with error handling
                return self._fetchapi(path, options);
            });
    }  

    async getTime() {
        const self = this;
        var response = await self._fetchapi('/util/time', { method: 'GET'});
        return response.json();
    }

    async getProgramWeb(uuid) {
        const self = this;
        var response = await self._fetchapi(`${web_v1}/programs/${uuid}`, { method: 'GET'});
        return response.json();
    }

    async getProgramTv(uuid) {
        const self = this;
        var response = await self._fetchapi(`${tv_v2}/programs/${uuid}`, { method: 'GET'});
        return response.json();
    }

    // array of uuid's
    async getPrograms(list, ignoreErrors = true) {
        const self = this;
        return Promise.all(list.map((e) => 
                self.getProgramWeb(e)
                    .then((result) => result)
                    .catch((error) => {
                        if (!ignoreErrors) {
                            throw new Error(error);
                        }
                        console.log(error);
                    })
                ))
                .then((r) => r.filter((f) => f));
    }

    async getVideoLongForm(uuid) {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/videos/long-form/${uuid}`, { method: 'GET'});
        return response.json();
    }

    async getVideoShortForm(uuid) {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/videos/short-form/${uuid}`, { method: 'GET'});
        return response.json();
    }

    async getMyList() {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/programs/myList`, { method: 'GET'});
        return response.json();
    }  

    async getMyListPrograms() {
        var json = await self.getMyList();
        return self.getPrograms(json);
    }  

    async getContinueWatching() {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/videos/continue-watching`, { method: 'GET'});
        return response.json();
    }

    async getContinueWatchingPrograms() {
        var json = await self.getContinueWatching();
        return self.getPrograms(json.data.map((e) => e.uuid));
    }

    async getTopPicks() {
        const self = this;
        var response = await self._fetchAuth(`${web_v1}/recommendation/top-picks`, { method: 'GET'});
        return response.json();
    }

    async getTopPickPrograms() {
        const self = this;
        var json = await self.getTopPicks();
        return self.getPrograms(json.list.map((e) => e.uuid));
    }   

    // Thanks to https://github.com/add-ons/plugin.video.goplay
    async getPage(page) {
        const self = this;
        var response = await self._fetchAuth(`${tv_v2}/pages/${page}`, { method: 'GET'});
        return response.json();
    }

    async getSwimLane(page, index, limit=100, offset=0) {
        const self = this;
        var response = await self._fetchAuth(`${tv_v2}/pages/${page}/lanes/${index}?limit=${limit}&offset=${offset}`, { method: 'GET' });
        return response.json();
    }

    async search(query, limit=100, offset=0) {
        const self = this;
        const payload = {
            query: query,
            limit: limit,
            offset: offset
        };

        var response = await self._fetchAuth(`${tv_v1}/search`, { method: 'POST', body: JSON.stringify(payload)});
        return response.json();
    }

    async getLiveStreams() {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/liveStreams`);
        return response.json();
    }

    async getEpisodes(uuid, offset=0, limit=100) {
        const self = this;
        var response = await self._fetchAuth(`${tv_v1}/playlists/${uuid}?offset=${offset}&limit=${limit}`);
        return response.json();
    }
}