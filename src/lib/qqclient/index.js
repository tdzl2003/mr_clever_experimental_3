const request = require('./request');
const { DEFAULT_HEADERS, SMART_QQ_URL } = require('./constants');

const clientid = 53999199;
let ptwebqq = '';
let vfwebqq = '';
let psessionid = '';
let account = '';
let selfInfo = null;

let friends = [];

const knownNicknames = {}; // uin => nickname
const knownMarknames = {}; // uin => marknames
const knownGroups = {}; // gid => { name, code, members: [], cards: {uin => card} }

async function loginWithCookie() {
  ptwebqq = request.getCookie(SMART_QQ_URL, 'ptwebqq');
  let resp = await request.postForm('http://d1.web2.qq.com/channel/login2', {
    r: JSON.stringify({
      ptwebqq,
      clientid,
      psessionid,
      status: 'online',
    }),
  });
  if (resp.retcode != 0) {
    return false;
  }

  psessionid = resp.result.psessionid;

  resp = await request.getJSON(
    `http://s.web2.qq.com/api/getvfwebqq?ptwebqq=${ptwebqq}&clientid=${clientid}&psessionid=${psessionid}&t=${Date.now()}`,
  );

  if (resp.retcode != 0) {
    return false;
  }
  psessionid = resp.result.psessionid;
  account = resp.result.uin;
  vfwebqq = resp.result.vfwebqq;
  return true;
}

function findWithRegexp(html, reg) {
  const m = reg.exec(html);
  if (!m) {
    throw new Error(`Failed to match ${reg} in html.`);
  }
  return m[1] || '';
}

function hashForQrSig(sig) {
  e = 0;
  for (i of sig) {
    e += (e << 5) + i.charCodeAt(0);
  }
  return 2147483647 & e;
}

function hashDigest(uin, ptwebqq) {
  let N = [0, 0, 0, 0];
  for (let t = 0; t < ptwebqq.length; ++t) N[t % 4] ^= ptwebqq.charCodeAt(t);
  let U = ['EC', 'OK'];
  let V = [0, 0, 0, 0];
  V[0] = (((uin | 0) >> 24) & 255) ^ U[0].charCodeAt(0);
  V[1] = (((uin | 0) >> 16) & 255) ^ U[0].charCodeAt(1);
  V[2] = (((uin | 0) >> 8) & 255) ^ U[1].charCodeAt(0);
  V[3] = ((uin | 0) & 255) ^ U[1].charCodeAt(1);
  U = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let T = 0; T < 8; T++)
    if (T % 2 == 0) {
      U[T] = N[T >> 1];
    } else {
      U[T] = V[T >> 1];
    }
  N = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
  ];
  V = '';
  for (const i of U) {
    V += N[(i >> 4) & 15];
    V += N[i & 15];
  }
  return V;
}

function checkRetCode(code, message) {
  if (code !== 0) {
    throw new Error(
      message ? `${message}: ${code}` : `Request return error code: ${code}`,
    );
  }
}

async function loginWithQrCode() {
  const html = await request.get(
    'https://ui.ptlogin2.qq.com/cgi-bin/login?daid=164&target=self&style=16&mibao_css=m_webqq&appid=501004106&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fw.qq.com%2Fproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20131024001',
  );
  const appid = findWithRegexp(
    html,
    /<input type="hidden" name="aid" value="(\d+)" \/>/,
  );
  const sign = findWithRegexp(
    html,
    /g_login_sig=encodeURIComponent\("([^"]*?)"\)/,
  );
  const js_ver = findWithRegexp(
    html,
    /g_pt_version=encodeURIComponent\("(\d+)"\)/,
  );
  const mibao_css = findWithRegexp(
    html,
    /g_mibao_css=encodeURIComponent\("([^"]*)"\)/,
  );
  const start_time = Date.now();

  for (;;) {
    const map = await request.get(
      `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${appid}&e=0&l=L&s=8&d=72&v=4`,
      {
        encoding: null,
      },
    );
    require('../server/state').setLoginQrCode(map);

    console.log('Open http://localhost:8094/state to show qrcode.');

    const qrsig = request.getCookie('http://ptlogin2.qq.com', 'qrsig');

    for (;;) {
      const resp = await request.get(
        `https://ssl.ptlogin2.qq.com/ptqrlogin?webqq_type=10&remember_uin=1&login2qq=1&aid=${appid}&u1=http%3A%2F%2Fw.qq.com%2Fproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=0-0-${Date.now() -
          start_time}&mibao_css=${mibao_css}&t=undefined&g=1&js_type=0&js_ver=${js_ver}&login_sig=${sign}&ptqrtoken=${hashForQrSig(
          qrsig,
        )}`,
      );

      let retcode;
      let redirection_url;
      function ptuiCB(...args) {
        retcode = args[0] | 0;
        console.log(args);
        redirection_url = args[2];
      }
      eval(resp);

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (retcode === 0) {
        console.log(await request.get(redirection_url));
        require('../server/state').setLoginQrCode(null);
        // Login successed.
        return;
      }
      if (retcode === 65) {
        // qrcode expired
        break;
      }
    }
  }
}

async function login() {
  // try cookie.
  if (!(await loginWithCookie())) {
    // try qrcode:
    await loginWithQrCode();

    if (!(await loginWithCookie())) {
      throw new Error('Login failed.');
    }
    console.log('Login successful with qrcode.');
  } else {
    console.log(
      'Login successful with cookie. You can remove cookie.json to reset login state.',
    );
  }

  await getSelfInfo();
  await queryFriendAccounts();
  // get_online_friends_list();
  await queryGroupList();
  // get_group_list_with_group_code();
}

async function getSelfInfo() {
  const resp = await request.getJSON(
    `http://s.web2.qq.com/api/get_self_info2?t=${Date.now() / 1000}`,
  );
  if (resp.retcode != 0) {
    throw new Error('Failed to get self info.');
  }
  selfInfo = resp.result;
}

function bkn() {
  skey = request.getCookie(SMART_QQ_URL, 'skey');
  let hash_str = 5381;
  for (const i of skey) {
    hash_str += (hash_str << 5) + i.charCodeAt(0);
  }
  hash_str = hash_str & 2147483647;
  return hash_str;
}

async function queryFriendAccounts() {
  const resp = await request.postForm(
    'http://s.web2.qq.com/api/get_user_friends2',
    {
      r: JSON.stringify({
        vfwebqq,
        hash: hashDigest(selfInfo.uin, ptwebqq),
      }),
    },
  );

  checkRetCode(resp.retcode, 'Failed to query friend list.');

  // const { friends, categories, info, marknames } = resp.result;

  friends = resp.result.friends.map(v => v.uin);

  for (const k of resp.result.info) {
    knownNicknames[k.uin] = k.nick;
  }
  for (const k of resp.result.marknames) {
    knownMarknames[k.uin] = k.markname;
  }
}

async function queryGroupList() {
  const resp = await request.postForm(
    'http://s.web2.qq.com/api/get_group_name_list_mask2',
    {
      r: JSON.stringify({
        vfwebqq,
        hash: hashDigest(selfInfo.uin, ptwebqq),
      }),
    },
  );

  checkRetCode(resp.retcode, 'Failed to query group list.');

  for (const item of resp.result.gnamelist) {
    const v = knownGroups || knownGroups[item.gid];

    v.code = item.code;
    v.name = item.name;
  }
}

async function queryGroupMembers(gid) {
  if (!knownGroups[gid]) {
    // maybe a new group.
    await queryGroupList();
  }
  const record = knownGroups[gid];
  if (!record) {
    throw new Error(`Unknown group ${gid}`);
  }

  const resp = await request.getJSON(
    `http://s.web2.qq.com/api/get_group_info_ext2?gcode=${
      record.code
    }&vfwebqq=${vfwebqq}&t=${Date.now()}`,
  );

  checkRetCode(resp.retcode, 'Failed to query group member list.');

  record.cards = record.cards || {};
  record.members = resp.result.minfo.map(v => v.uin);

  for (const k of resp.result.cards) {
    record.cards[k.muin] = k.card;
  }

  for (const k of resp.result.minfo) {
    knownNicknames[k.uin] = k.nick;
  }
}

async function pullMessage() {
  const resp = await request.postForm(
    'http://d1.web2.qq.com/channel/poll2',
    {
      r: JSON.stringify({
        ptwebqq,
        clientid,
        psessionid,
        key: '',
      }),
    },
    {
      ...DEFAULT_HEADERS,
      Referer: 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
    },
  );
  if (!resp) {
    return [];
  }
  switch (resp.retcode) {
    case 0: {
      // receive ok.
      if (!resp.result || !resp.result.length) {
        return [];
      }
    }
    case 116: {
      // ptwebqq changed.
      ptwebqq = resp.p;
      return [];
    }
    case 1202:
    default: {
      console.log(resp);
      throw new Error(`Failed to pull message, code: ${resp.retcode}`);
    }
  }
}

exports.login = login;
exports.pullMessage = pullMessage;
