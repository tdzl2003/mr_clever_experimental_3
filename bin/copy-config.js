const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

if (!fs.existsSync(path.resolve(root, 'config.json'))) {
  const content = fs.readFileSync(path.resolve(root, 'config.default.json'));

  fs.writeFileSync(path.resolve(root, 'config.json'), content);
}
