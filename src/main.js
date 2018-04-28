const qqclient = require('./lib/qqclient');

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
