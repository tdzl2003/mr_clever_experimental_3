const qqclient = require('./lib/qqclient');
const config = require('../config.json');
const fs = require('fs');

const csvStringify = require('csv-stringify');

require('./lib/server').listen(8094, 'localhost', () => {
  console.log('Server Ready.');
});

const waitForSigInt = new Promise((resolve, reject) => {
  process.on('SIGINT', () => {
    reject(new Error('User pressed Ctrl+C'));
  });
});

let csvStream = null;

if (config.features.recordMessage) {
  csvStream = csvStringify();
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }
  const { RollingFileStream } = require('streamroller');
  const stream = new RollingFileStream('./data/message.csv', 1 << 20, {
    compress: true,
  });
  csvStream.pipe(stream);
}

function onMessage(msg) {
  switch (msg.type) {
    case 'message':
    case 'group_message':
      csvStream.write([
        msg.type,
        msg.content,
        msg.send_uin,
        msg.time,
        msg.nick,
        msg.markname,
        msg.group_code,
        msg.group_name,
        msg.card_name,
      ]);
      break;
  }
}

async function main() {
  try {
    await Promise.race([waitForSigInt, qqclient.login()]);

    qqclient.loadCache();

    for (;;) {
      const messages = await Promise.race([
        waitForSigInt,
        qqclient.pullMessage(),
      ]);
      for (const message of messages) {
        await onMessage(message);
      }
    }
  } finally {
    qqclient.saveCache();
    console.log('Bye.');
  }
}

main().catch(err => {
  setTimeout(() => {
    throw err;
  });
});
