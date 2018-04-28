const Koa = require('koa');

const app = new Koa();
const root = require('./root');

require('./state');

app.use(root.routes());
app.use(root.allowedMethods());

module.exports = app;
