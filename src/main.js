const qqclient = require('./lib/qqclient');

require('./lib/server').listen(8094, 'localhost', () => {
  console.log('Server Ready.');
});

const waitForSigInt = new Promise((resolve, reject) => {
  process.on('SIGINT', () => {
    reject(new Error('User pressed Ctrl+C'));
  });
});

async function main() {
  try {
    await Promise.race([waitForSigInt, qqclient.login()]);

    qqclient.loadCache();

    for (;;) {
      const messages = await Promise.race([
        waitForSigInt,
        qqclient.pullMessage(),
      ]);
      console.log(messages);
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
