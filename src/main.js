const qqclient = require('./lib/qqclient');

require('./lib/server').listen(8094, 'localhost', () => {
  console.log('Ready.');
});

const waitForSigInt = new Promise((resolve, reject) => {
  process.on('SIGINT', reject);
});

async function main() {
  await qqclient.login();

  console.log('Bye.');

  for (;;) {
    const messages = await Promise.race([
      waitForSigInt,
      qqclient.pullMessage(),
    ]);
    console.log(messages);
  }

  // throw new Error('break');
}

main().catch(err => {
  setTimeout(() => {
    throw err;
  });
});
