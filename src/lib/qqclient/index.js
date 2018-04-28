const request = require('./request');
const { SMART_QQ_URL } = require('./constants');

const clientid = 53999199;
let ptwebqq = '';
let vfwebqq = '';
let psessionid = '';
let account = '';

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

function hash_for_qrsig(sig) {
  e = 0;
  for (i of sig) {
    e += (e << 5) + i.charCodeAt(0);
  }
  return 2147483647 & e;
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

    const qrsig = request.getCookie('http://ptlogin2.qq.com', 'qrsig');

    for (;;) {
      const resp = await request.get(
        `https://ssl.ptlogin2.qq.com/ptqrlogin?webqq_type=10&remember_uin=1&login2qq=1&aid=${appid}&u1=http%3A%2F%2Fw.qq.com%2Fproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=0-0-${Date.now() -
          start_time}&mibao_css=${mibao_css}&t=undefined&g=1&js_type=0&js_ver=${js_ver}&login_sig=${sign}&ptqrtoken=${hash_for_qrsig(
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
  if (await loginWithCookie()) {
    console.log(
      'Login successful with cookie. You can remove cookie.json to reset login state.',
    );
    return;
  }

  // try qrcode:
  await loginWithQrCode();

  if (!(await loginWithCookie())) {
    throw new Error('Login failed.');
  }

  console.log('Login successful with qrcode.');
}

exports.login = login;
