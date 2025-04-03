import pkg from 'stremio-addon-sdk';
import GoPlay from './lib/goplay.js';
const { addonBuilder, serveHTTP } = pkg;

const cacheMaxAge = 3600;
const api = new GoPlay();

api.getVersion()
    .then((result) => console.log(result.version))
    .then((result) => api.getTopPickPrograms())
    .then((result) => {
        console.log(result);
        return result;
    })
    

// Stremio addon builder
const builder = new addonBuilder({
    id: 'org.worstenbrood.goplayio',
    version: '1.0.0',
    name: 'GoPlayIO',

    // Properties that determine when Stremio picks this addon
    // this means your addon will be used for streams of the type movie
    catalogs: [],
    resources: ['stream'],
    types: ['movie', 'series', 'catalog'],
    idPrefixes: ['tt'],
    
    // We need config
    behaviorHints: { 
        configurationRequired: true, 
        configurable: true
    },
    
    config :[
        { key: 'email', type: 'text', title: 'Email', required: true},
        { key: 'password', type: 'password', title: 'Password', required: true}
    ]
});

// Stremio stream handler
builder.defineStreamHandler(async function(args) { 
    return { streams: [] };
});

serveHTTP(builder.getInterface(), { 
    port: process.env.PORT || 7007, 
    cacheMaxAge: cacheMaxAge 
});