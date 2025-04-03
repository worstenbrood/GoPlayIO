const loginurl = 'https://www.goplay.be/login';
const apiurl = 'https://api.goplay.be';
const apipath = '/web/v1';
const versionUrl = 'https://api.kaching.eu.com/v1/web/goplay/cfg.json';
const apikey = 'eyJraWQiOiJCSHZsMjdjNzdGR2J5YWNyTk8xXC9yWXBPTjlzMFFPbjhtUTdzQnA5eCtvbz0iLCJhbGciOiJSUzI1NiJ9.eyJjdXN0b206YWNjb3VudF9jb25zZW50Ijoie1wiYWNjZXB0ZWRcIjp0cnVlLFwiZGF0ZVwiOjE3NDMzNzc4ODd9Iiwic3ViIjoiNjgxYjMwMzItN2M0YS00ZTg3LTg1MzItMTc4MTdmNzhiMjNhIiwid2Vic2l0ZSI6IntcInNpdGVOYW1lXCI6XCJHb1BsYXlcIixcInVybFwiOlwiXC9cIixcIm5ld3NsZXR0ZXJcIjp0cnVlLFwiZ29QbGF5UGVyc29uYWxpemVkQWRzXCI6dHJ1ZX0iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYmlydGhkYXRlIjoiMDFcLzAyXC8xOTgyIiwiZ2VuZGVyIjoiTSIsImN1c3RvbTpkYXRhc2hpZnRJZCI6IjdjOGZjMTE3LWYwYTAtNGI3Ny1hNzdhLTM4MmY1ZjJiMTNiOCIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbVwvZXUtd2VzdC0xX2RWaVNzS001WSIsImN1c3RvbTpwb3N0YWxfY29kZSI6IjI1NzAiLCJjb2duaXRvOnVzZXJuYW1lIjoidzU3MDA0YWpkNjltOHdhNmpjbiIsImF1ZCI6IjZzMWg4NTFzOHVwbGNvNWg2bXFoMWphYzhtIiwiZXZlbnRfaWQiOiI2Zjc5MzJmYy1jOWU4LTRiZjItOTE3YS0zYTAwNjY3NTVmMWUiLCJjdXN0b206c2JzX2NvbmZpcm1lZF96ZXMiOiI2NjkiLCJ1cGRhdGVkX2F0IjoxNzQzMzc3ODg3LCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTc0MzYxNjQ4NCwiZXhwIjoxNzQzNjc0NzIzLCJpYXQiOjE3NDM2NzExMjMsImVtYWlsIjoid29yc3RlbmJyb29kQGdtYWlsLmNvbSJ9.IhMFNIyzKOBFNqLmCtgE4sFpMCvKaR8tqQE1pOK4g1K34gNMA7ygYRMQihbOAPcTW4pU0r-qDeBzcA7972liYrTlTM4uC3aJVgRJjBRirJv_-iRq-HL_MSWcMQBEEaJdxJ4WYF-3uiz9ySwGwSEpMlDJmtx1S2x2aFWRAILUPnK1uWw0jmTPCL6DRNXts-N2qmOHw-Fyqp0nwf0WSy2chH1ERfD007MYtHcuadT3iF4b4i1QKUnuPM0zPWKH6zkg-Tx-W__NxozYpMj7Tkc4hq_tAArcXgdLF_csbcLcstBVa7q1oJbcBXWH129w41O7SJLmA6-ZUfpkfDrqaWe4Lw';

export default class GoPlay {
    constructor(options) {
        const self = this;
        options = options || {}
        self.endpoint = options.endpoint || apiurl;
        self.email = options.email;
        self.password = options.password;
    }   

    async _fetchapi(url, options) {
        url = apiurl + url;
        return fetch(url, options)
            .then((result) => {
                if (!result.ok) {
                    return result.json()
                        .then((json) => new Promise((resolve, reject) => reject(`Status ${result.status} (${result.url}): ${json.message}`)));
                }
                return result;
            });
    }

    async _fetchAuth(url, options) {
        const self = this;
        options = options || {};
        options.headers = options.headers || {};

        // Set headers
        options.headers['Authorization'] = 'Bearer ' + apikey;
        options.headers['Accept'] = 'application/json';
        options.headers['Connection'] = 'keep-alive';

        // Fetch with error handling
        return self._fetchapi(url, options);
            
    }  

    async login() {
        const self = this;
        const formData = new FormData()
        formData.append('email', self.email);
        formData.append('password', self.password);
        await fetch(loginurl, { 
            method: 'POST', 
            body: formData,
        })
        .then((r) => {
            console.log(r);
            return r.text();
        })
        .then((r) => console.log(r));
    }

    async getVersion() {
        const self = this;
        var response = await fetch(versionUrl, { method: 'GET'});
        return response.json();
    }

    async getTime() {
        const self = this;
        var response = await self._fetchapi('/util/time', { method: 'GET'});
        return response.json();
    }

    async getProgram(uuid) {
        const self = this;
        var response = await self._fetchapi(`${apipath}/programs/${uuid}`, { method: 'GET'});
        return response.json();
    }

    // array of uuid's
    async getPrograms(list, ignoreErrors = true) {
        const self = this;
        return Promise.all(list.map((e) => 
                self.getProgram(e)
                    .then((result) => result)
                    .catch((error) => {
                        if (!ignoreErrors) {
                            throw new Error(error);
                        }
                        console.log(error);
                    })
                )
            );
    }

    async getVideoLongFrom(uuid) {
        const self = this;
        var response = await self._fetchapi(`${apipath}/videos/long-form/${uuid}`, { method: 'GET'});
        return response.json();
    }

    async getMyList() {
        const self = this;
        var response = await self._fetchAuth(`${apipath}/programs/myList`, { method: 'GET'});
        return response.json();
    }  

    async getMyListPrograms() {
        var json = await self.getMyList();
        return self.getPrograms(json);
    }  

    async getContinueWatching() {
        const self = this;
        var response = await self._fetchAuth(`${apipath}/videos/continue-watching`, { method: 'GET'});
        return response.json();
    }

    async getContinueWatchingPrograms() {
        var json = await self.getContinueWatching();
        return self.getPrograms(json.data.map((e) => e.uuid));
    }

    async getTopPicks() {
        const self = this;
        var response = await self._fetchAuth(`${apipath}/recommendation/top-picks`, { method: 'GET'});
        return response.json();
    }

    async getTopPickPrograms() {
        const self = this;
        var json = await self.getTopPicks();
        return self.getPrograms(json.list.map((e) => e.uuid));
    }   
}