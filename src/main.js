const qqclient = require('./lib/qqclient');

require('./lib/server').listen(8094, 'localhost', () => {
  console.log('Ready.');
});

async function main() {
  await qqclient.login();

  console.log('Bye.');

  throw new Error('break');
}

main().catch(err => {
  setTimeout(() => {
    throw err;
  });
});
