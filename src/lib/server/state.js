const root = require('./root');
const renderHTML = require('./renderHTML');

let image = null;

root.get('/state', ctx => {
  if (image) {
    ctx.body = renderHTML(`<img src="/qrcode?t=${Date.now()}" id="qrcode" />
    <script type="application/javascript">
      var el = document.querySelector('#qrcode');
      setInterval(function() {
        el.src = '/qrcode?t=' + Date.now();
      }, 1000);
    </script>`);
  }
});

root.get('/qrcode', ctx => {
  if (!image) {
    return;
  }
  ctx.body = image;
});

exports.setLoginQrCode = function(buffer) {
  image = buffer;
};
