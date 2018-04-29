const qqclient = require('./lib/qqclient');

require('./lib/server').listen(8094, 'localhost', () => {
  console.log('Ready.');
});

const waitForSigInt = new Promise((resolve, reject) => {
  process.on('SIGINT', reject);
});

async function main() {
  await qqclient.login();

  for (;;) {
    const messages = await Promise.race([
      waitForSigInt,
      qqclient.pullMessage(),
    ]);
    console.log(messages);
  }

  console.log('Bye.');

  // throw new Error('break');
}

main().catch(err => {
  setTimeout(() => {
    throw err;
  });
});
