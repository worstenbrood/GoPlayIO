import pkg from 'stremio-addon-sdk';
import {GoPlay, idPrefix} from './lib/goplay.js';

const { addonBuilder, serveHTTP, publishToCentral } = pkg;
const cacheMaxAge = 60;

// Stremio addon builder
const builder = new addonBuilder({
    id: 'org.worstenbrood.goplayio',
    version: '1.0.0',
    name: 'GoPlayIO',

    // Properties that determine when Stremio picks this addon
    // this means your addon will be used for streams of the type movie
    catalogs: [{
        id: 'goplay-series',
        name: 'GoPlay',
        type: 'series',
        extra: [
            { 'name': 'skip', 'isRequired': false },
            { 'name': 'search', 'isRequired': false },
        ]}, {
        id: 'goplay-movie',
        name: 'GoPlay',
        type: 'movie',
        extra: [
            { 'name': 'skip', 'isRequired': false },
            { 'name': 'search', 'isRequired': false },
        ]}],

    resources: ['catalog', {
            name: 'meta',
            types: ['movie', 'series', 'tv'],
            idPrefixes: [idPrefix]
        }, 'stream'],

    types: ['movie', 'series', 'tv'],
    idPrefixes: [idPrefix],
    
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
    console.log(args);
    const goplay = new GoPlay(args.config.email, args.config.password);
    const stream = await goplay.getVideo(args.id);
    return Promise.resolve({ streams: [stream], cacheMaxAge: cacheMaxAge });
});

// Stremio catalog handler
builder.defineCatalogHandler(async function(args) { 
    console.log(args);

    const goplay = new GoPlay(args.config.email, args.config.password);   
    if (args.type == 'series') {
        switch(args.id) {
            case 'goplay-series':
                return new Promise(async (resolve, reject) => 
                    await goplay.getAllPrograms(args.extra.skip)
                        .then((r) => resolve({ metas: r, cacheMaxAge: cacheMaxAge }))
                        .catch((e) => reject(e)));
        }
    } 
    else if (args.type == 'movie') {
        return Promise.resolve({ metas: [] });
    }

    return Promise.resolve({ metas: [] });
});

// Stremio stream handler
builder.defineMetaHandler(async function(args) { 
    console.log(args);
    const goplay = new GoPlay(args.config.email, args.config.password);
    const meta = await goplay.getMeta(args.id);
    return Promise.resolve({ meta: meta });
});

serveHTTP(builder.getInterface(), { 
    port: process.env.PORT || 7007, 
    cacheMaxAge: cacheMaxAge 
});