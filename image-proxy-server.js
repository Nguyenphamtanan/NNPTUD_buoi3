const express = require('express');
const cors = require('cors');
const fetch = global.fetch; // Node 18+ has global fetch

const app = express();
app.use(cors());
app.disable('x-powered-by');

// Simple image proxy: /img?url=<encoded-url>
app.get('/img', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url param');
  try {
    const remote = await fetch(url, { timeout: 10000 });
    if (!remote.ok) return res.status(502).send('Bad response from remote');
    const contentType = remote.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    // Stream the image to the client
    remote.body.pipe(res);
  } catch (err) {
    console.error('Proxy error for', url, err && err.message);
    res.status(500).send('Proxy error');
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Image proxy running on http://localhost:${port}`));
