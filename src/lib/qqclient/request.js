const { DEFAULT_HEADERS } = require('./constants');

const FileCookieStore = require('./filestore').FileCookieStore;
const cookieStore = new FileCookieStore('./cookie.json', { encrypt: false });
const jar = require('request-promise').jar(cookieStore);

const request = require('request-promise').defaults({
  jar,
});

const DEBUG = __DEV__;

exports.get = function(url, options) {
  if (DEBUG) {
    console.log(`GET ${url}\n`);
  }
  return request.get(url, options);
};

exports.postForm = async function(url, data, headers) {
  if (DEBUG) {
    console.log(`POST ${url} ${JSON.stringify(data).slice(0, 500)}\n`);
  }

  const resp = await request.post(url, {
    form: data,
    headers: headers || DEFAULT_HEADERS,
    json: true,
  });

  if (DEBUG) {
    console.log(`RESP: ${JSON.stringify(resp).slice(0, 500)}\n`);
  }
  return resp;
};

exports.getJSON = async function(url, headers) {
  if (DEBUG) {
    console.log(`GET ${url}\n`);
  }

  const resp = await request.get(url, {
    headers: headers || DEFAULT_HEADERS,
    json: true,
  });

  if (DEBUG) {
    console.log(`RESP: ${JSON.stringify(resp).slice(0, 500)}\n`);
  }
  return resp;
};

exports.getCookie = function(domain, key) {
  const resp = jar.getCookies(domain).find(v => v.key === key);
  return resp && resp.value;
};

exports.clearCookie = function() {
  cookieStore.idx = {};
  cookieStore.flush();
};
