function renderHTML(body, title) {
  return `<!DOCTYPE html>
<html>

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1">
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
  <title>
    ${title || '小智'}
  </title>
  <link rel="apple-touch-icon-precomposed" href="/favicon-152.png">
</head>

<body>
${body}
</body>

</html>
`;
}

module.exports = renderHTML;
