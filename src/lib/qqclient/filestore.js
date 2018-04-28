'use strict';

var util = require('util'),
  fs = require('fs'),
  crypto = require('crypto'),
  tough = require('tough-cookie'),
  Store = tough.MemoryCookieStore;

function FileCookieStore(filePath, option) {
  Store.call(this);
  this.idx = {}; // idx is memory cache
  this.filePath = filePath;
  option = option || {};
  option.encrypt = !(option.encrypt === false);
  if (option.encrypt) {
    option.algorithm = option.algorithm || 'aes-256-cbc';
    option.password = option.password || 'tough-cookie-store';
  }
  this.option = option;
  var self = this;
  loadFromFile(this.filePath, option, function(dataJson) {
    if (dataJson) self.idx = dataJson;
  });
}
util.inherits(FileCookieStore, Store);
exports.FileCookieStore = FileCookieStore;

FileCookieStore.prototype.putCookie = function(cookie, cb) {
  if (!this.idx[cookie.domain]) {
    this.idx[cookie.domain] = {};
  }
  if (!this.idx[cookie.domain][cookie.path]) {
    this.idx[cookie.domain][cookie.path] = {};
  }
  this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
  saveToFile(this.filePath, this.idx, this.option, function() {
    cb(null);
  });
};

FileCookieStore.prototype.removeCookie = function removeCookie(
  domain,
  path,
  key,
  cb,
) {
  if (
    this.idx[domain] &&
    this.idx[domain][path] &&
    this.idx[domain][path][key]
  ) {
    delete this.idx[domain][path][key];
  }
  saveToFile(this.filePath, this.idx, this.option, function() {
    cb(null);
  });
};

FileCookieStore.prototype.removeCookies = function removeCookies(
  domain,
  path,
  cb,
) {
  if (this.idx[domain]) {
    if (path) {
      delete this.idx[domain][path];
    } else {
      delete this.idx[domain];
    }
  }
  saveToFile(this.filePath, this.idx, this.option, function() {
    return cb(null);
  });
};

FileCookieStore.prototype.getCookie = function(domain, path, key) {
  if (!this.idx[domain]) {
    return undefined;
  }
  if (!this.idx[domain][path]) {
    return undefined;
  }
  return this.idx[domain][path][key];
};

FileCookieStore.prototype.flush = function() {
  saveToFile(this.filePath, this.idx, this.option);
};

FileCookieStore.prototype.isEmpty = function() {
  return isEmptyObject(this.idx);
};

var hasOwnProperty = Object.prototype.hasOwnProperty;

function isEmptyObject(obj) {
  for (var key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}

function saveToFile(filePath, data, option, cb) {
  var dataJson = JSON.stringify(data);
  if (option.encrypt) {
    var cipher = crypto.createCipher(option.algorithm, option.password);
    dataJson = cipher.update(dataJson, 'utf8', 'hex');
    dataJson += cipher.final('hex');
  }
  fs.writeFileSync(filePath, dataJson);
  if (typeof cb === 'function') cb();
}

function loadFromFile(filePath, option, cb) {
  var data = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'a+' });
  if (option.encrypt && data) {
    var decipher = crypto.createDecipher(option.algorithm, option.password);
    data = decipher.update(data, 'hex', 'utf8');
    data += decipher.final('utf8');
  }
  var dataJson = data ? JSON.parse(data) : null;
  for (var domainName in dataJson) {
    for (var pathName in dataJson[domainName]) {
      for (var cookieName in dataJson[domainName][pathName]) {
        dataJson[domainName][pathName][cookieName] = tough.fromJSON(
          JSON.stringify(dataJson[domainName][pathName][cookieName]),
        );
      }
    }
  }
  cb(dataJson);
}
