'use strict';
import tough from 'tough-cookie';
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
import util from 'util';
import fs from 'fs';

export default class FileCookieStore {
    constructor(filePath) {
        this.idx = {}; // idx is memory cache
        this.filePath = filePath;
        var self = this;
        loadFromFile(this.filePath, function (dataJson) {
            if (dataJson)
                self.idx = dataJson;
        });
    }
    // force a default depth:
    inspect() {
        return "{ idx: " + util.inspect(this.idx, false, 2) + ' }';
    }
    findCookie(domain, path, key, cb) {
        if (!this.idx[domain]) {
            return cb(null, undefined);
        }
        if (!this.idx[domain][path]) {
            return cb(null, undefined);
        }
        return cb(null, this.idx[domain][path][key] || null);
    }
    findCookies(domain, path, key, cb) {
        var results = [];
        if (!domain) {
            return cb(null, []);
        }

        var pathMatcher;
        if (!path) {
            // null or '/' means "all paths"
            pathMatcher = function matchAll(domainIndex) {
                for (var curPath in domainIndex) {
                    var pathIndex = domainIndex[curPath];
                    for (var key in pathIndex) {
                        results.push(pathIndex[key]);
                    }
                }
            };

        } else if (path === '/') {
            pathMatcher = function matchSlash(domainIndex) {
                var pathIndex = domainIndex['/'];
                if (!pathIndex) {
                    return;
                }
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            };

        } else {
            var paths = permutePath(path) || [path];
            pathMatcher = function matchRFC(domainIndex) {
                paths.forEach(function (curPath) {
                    var pathIndex = domainIndex[curPath];
                    if (!pathIndex) {
                        return;
                    }
                    for (var key in pathIndex) {
                        results.push(pathIndex[key]);
                    }
                });
            };
        }

        var domains = permuteDomain(domain) || [domain];
        var idx = this.idx;
        domains.forEach(function (curDomain) {
            var domainIndex = idx[curDomain];
            if (!domainIndex) {
                return;
            }
            pathMatcher(domainIndex);
        });

        cb(null, results);
    }
    putCookie(cookie, cb) {
        if (!this.idx[cookie.domain]) {
            this.idx[cookie.domain] = {};
        }
        if (!this.idx[cookie.domain][cookie.path]) {
            this.idx[cookie.domain][cookie.path] = {};
        }
        this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
        saveToFile(this.filePath, this.idx, function () {
            cb(null);
        });
    }
    updateCookie(oldCookie, newCookie, cb) {
        // updateCookie() may avoid updating cookies that are identical.  For example,
        // lastAccessed may not be important to some stores and an equality
        // comparison could exclude that field.
        this.putCookie(newCookie, cb);
    }
    removeCookie(domain, path, key, cb) {
        if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
            delete this.idx[domain][path][key];
        }
        saveToFile(this.filePath, this.idx, function () {
            cb(null);
        });
    }
    removeCookies(domain, path, cb) {
        if (this.idx[domain]) {
            if (path) {
                delete this.idx[domain][path];
            } else {
                delete this.idx[domain];
            }
        }
        saveToFile(this.filePath, this.idx, function () {
            return cb(null);
        });
    }
}
util.inherits(FileCookieStore, Store);

FileCookieStore.prototype.idx = null;
FileCookieStore.prototype.synchronous = true;

function saveToFile(filePath, data, cb) {
    var dataJson = JSON.stringify(data);
    fs.writeFile(filePath, dataJson, function (err) {
        if (err) throw err;
        cb();
    });
}

function loadFromFile(filePath, cb) {
    var data = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    var dataJson = data ? JSON.parse(data) : null;
    for(var domainName in dataJson) {
        for(var pathName in dataJson[domainName]) {
            for(var cookieName in dataJson[domainName][pathName]) {
                dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
            }
        }
    }
    cb(dataJson);
}
