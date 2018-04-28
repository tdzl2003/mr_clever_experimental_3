const { DEFAULT_HEADERS } = require('./constants');

const FileCookieStore = require('./filestore').FileCookieStore;
const jar = require('request-promise').jar(
  new FileCookieStore('./cookie.json', { encrypt: false }),
);

const request = require('request-promise').defaults({
  jar,
});

const DEBUG = __DEV__ && true;

exports.get = function(url, options) {
  if (DEBUG) {
    console.log(`GET ${url}\n`);
  }
  return request.get(url, options);
};

exports.postJSON = async function(url, data, headers) {
  if (DEBUG) {
    console.log(`POST ${url} ${JSON.stringify(data)}\n`);
  }

  const resp = await request.post(url, {
    body: data,
    headers: headers || DEFAULT_HEADERS,
    json: true,
  });

  if (DEBUG) {
    console.log(`RESP: ${JSON.stringify(resp)}\n`);
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
    console.log(`RESP: ${JSON.stringify(resp)}\n`);
  }
  return resp;
};

exports.getCookie = function(domain, key) {
  const resp = jar.getCookies(domain).find(v => v.key === key);
  return resp && resp.value;
};
