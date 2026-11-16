import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Routes from './routes.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const routes = new Routes();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.tpl': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// In-memory session store
const sessions = new Map();

function getSession(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/);
  let sid = match ? match[1] : null;

  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomUUID();
    sessions.set(sid, {});
    res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
  }
  return sessions.get(sid);
}

function parseMultipartFormData(raw, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]).trim();
  if (!boundary || boundary.length > 200) {
    throw Object.assign(new Error('Invalid multipart boundary'), { statusCode: 400 });
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const separator = Buffer.from('\r\n\r\n');
  const parsed = {};
  let cursor = 0;
  let complete = false;
  if (!raw.subarray(0, delimiter.length).equals(delimiter)) {
    throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
  }
  cursor = delimiter.length;

  while (cursor < raw.length) {
    if (raw.subarray(cursor, cursor + 2).toString() === '--') {
      complete = true;
      break;
    }
    if (raw.subarray(cursor, cursor + 2).toString() !== '\r\n') {
      throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
    }

    const headerStart = cursor + 2;
    const headerEnd = raw.indexOf(separator, headerStart);
    if (headerEnd < 0) {
      throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
    }
    const headers = raw.subarray(headerStart, headerEnd).toString('utf8');
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
    const nameMatch = disposition && disposition[1].match(/(?:^|;)\s*name="([^"]*)"/i);
    if (!nameMatch) {
      throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
    }

    const dataStart = headerEnd + separator.length;
    const nextPart = raw.indexOf(Buffer.from(`\r\n--${boundary}`), dataStart);
    if (nextPart < 0) {
      throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
    }
    const data = raw.subarray(dataStart, nextPart);
    const filenameMatch = disposition[1].match(/(?:^|;)\s*filename="([^"]*)"/i);
    if (filenameMatch && filenameMatch[1]) {
      const contentTypeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
      parsed[nameMatch[1]] = {
        originalName: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim().toLowerCase() : '',
        data
      };
    } else if (!filenameMatch) {
      parsed[nameMatch[1]] = data.toString('utf8');
    }
    cursor = nextPart + 2 + delimiter.length;
  }
  if (!complete) {
    throw Object.assign(new Error('Malformed multipart form data'), { statusCode: 400 });
  }
  return parsed;
}

async function parseBody(req) {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') return {};

  const contentType = req.headers['content-type'] || '';
  const normalizedContentType = contentType.toLowerCase();
  const chunks = [];
  let totalSize = 0;
  const maxRequestSize = normalizedContentType.includes('multipart/form-data')
    ? 5 * 1024 * 1024 + 128 * 1024
    : Infinity;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > maxRequestSize) {
      throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks);
  if (normalizedContentType.includes('multipart/form-data')) {
    return parseMultipartFormData(raw, contentType);
  }
  const text = raw.toString('utf8');
  if (normalizedContentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  const parsed = {};
  const params = new URLSearchParams(text);
  for (const [key, value] of params.entries()) {
    parsed[key] = value;
  }
  return parsed;
}

async function serveStaticFile(filePath, res) {
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return false;

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  const session = getSession(req, res);
  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    console.error('Error parsing request body:', error);
    res.writeHead(error.statusCode || 400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error.statusCode === 413 ? 'Request body too large' : 'Invalid request body');
    return;
  }

  const isGetOrHead = method === 'GET' || method === 'HEAD';

  // Minimal Koa-compatible context object
  const ctx = {
    req,
    res,
    session,
    params: {},
    request: {
      body,
      headers: req.headers
    },
    status: 200,
    type: 'text/html; charset=utf-8',
    body: null,
    redirect(location) {
      res.writeHead(302, { Location: location });
      res.end();
    }
  };

  try {
    // 1. Static files under /res/
    if (pathname.startsWith('/res/')) {
      const relPath = pathname.slice('/res/'.length);
      const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(__dirname, 'res', safePath);
      const served = await serveStaticFile(filePath, res);
      if (served) {
        console.log(`  <-- ${method} ${pathname} 200 ${Date.now() - start}ms`);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      console.log(`  <-- ${method} ${pathname} 404 ${Date.now() - start}ms`);
      return;
    }

    // 2. Uploaded profile images
    const uploadMatch = pathname.match(/^\/uploads\/([a-f0-9-]{36}\.(?:png|jpg|gif|webp))$/);
    if (uploadMatch && isGetOrHead) {
      const filePath = path.join(__dirname, 'uploads', uploadMatch[1]);
      const served = await serveStaticFile(filePath, res);
      if (served) {
        console.log(`  <-- ${method} ${pathname} 200 ${Date.now() - start}ms`);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      console.log(`  <-- ${method} ${pathname} 404 ${Date.now() - start}ms`);
      return;
    }

    // 3. Favicon
    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 4. Theme assets: /themes/:theme/:file
    const themeMatch = pathname.match(/^\/themes\/([^\/]+)\/([^\/]+)$/);
    if (themeMatch && isGetOrHead) {
      ctx.params = { theme: themeMatch[1], file: themeMatch[2] };
      await routes.themes(ctx);
    }
    // 4. Set theme: /settheme/:theme
    else if (pathname.startsWith('/settheme/') && isGetOrHead) {
      const theme = pathname.slice('/settheme/'.length);
      ctx.params = { theme };
      await routes.setTheme(ctx);
    }
    // 5. Home or Login
    else if ((pathname === '/' || pathname === '/login') && isGetOrHead) {
      await routes.index(ctx);
    }
    // 6. Register form & handler
    else if (pathname === '/register' && isGetOrHead) {
      await routes.registerForm(ctx);
    } else if (pathname === '/register' && method === 'POST') {
      await routes.registerUser(ctx);
    }
    // 7. Login
    else if (pathname === '/login' && method === 'POST') {
      await routes.loginUser(ctx);
    }
    // 8. Logoff
    else if (pathname === '/logoff' && isGetOrHead) {
      await routes.logoffUser(ctx);
    }
    // 9. Community Members Directory
    else if (pathname === '/people' && isGetOrHead) {
      await routes.listUsers(ctx);
    }
    // 10. Social Network: Following & Followers (Menu shortcuts)
    else if ((pathname === '/following' || pathname === '/connections') && isGetOrHead) {
      await routes.showConnections(ctx, null, 'following');
    }
    else if (pathname === '/followers' && isGetOrHead) {
      await routes.showConnections(ctx, null, 'followers');
    }
    // 11. Self Profile
    else if (pathname === '/profile' && isGetOrHead) {
      await routes.showProfile(ctx, null);
    }
    // 12. Profile Edit Form (GET)
    else if (pathname.match(/^\/profile\/([^\/]+)\/edit$/) && isGetOrHead) {
      const match = pathname.match(/^\/profile\/([^\/]+)\/edit$/);
      await routes.showEditProfile(ctx, decodeURIComponent(match[1]));
    }
    // 13. Profile Edit Save (POST)
    else if (pathname.match(/^\/profile\/([^\/]+)\/edit$/) && method === 'POST') {
      const match = pathname.match(/^\/profile\/([^\/]+)\/edit$/);
      await routes.updateProfile(ctx, decodeURIComponent(match[1]));
    }
    // 14. Follow Member (POST)
    else if (pathname.match(/^\/profile\/([^\/]+)\/follow$/) && method === 'POST') {
      const match = pathname.match(/^\/profile\/([^\/]+)\/follow$/);
      await routes.followUser(ctx, decodeURIComponent(match[1]));
    }
    // 15. Unfollow Member (POST)
    else if (pathname.match(/^\/profile\/([^\/]+)\/unfollow$/) && method === 'POST') {
      const match = pathname.match(/^\/profile\/([^\/]+)\/unfollow$/);
      await routes.unfollowUser(ctx, decodeURIComponent(match[1]));
    }
    // 16. Member's Following List (GET)
    else if (pathname.match(/^\/profile\/([^\/]+)\/following$/) && isGetOrHead) {
      const match = pathname.match(/^\/profile\/([^\/]+)\/following$/);
      await routes.showConnections(ctx, decodeURIComponent(match[1]), 'following');
    }
    // 17. Member's Followers List (GET)
    else if (pathname.match(/^\/profile\/([^\/]+)\/followers$/) && isGetOrHead) {
      const match = pathname.match(/^\/profile\/([^\/]+)\/followers$/);
      await routes.showConnections(ctx, decodeURIComponent(match[1]), 'followers');
    }
    // 18. Specific Member Profile (GET)
    else if (pathname.match(/^\/profile\/([^\/]+)$/) && isGetOrHead) {
      const match = pathname.match(/^\/profile\/([^\/]+)$/);
      await routes.showProfile(ctx, decodeURIComponent(match[1]));
    }
    // 14. Discussions Dashboard (GET)
    else if (pathname === '/messages' && isGetOrHead) {
      await routes.showDiscussions(ctx, null);
    }
    // 15. Direct Discussion Thread with User (GET)
    else if (pathname.match(/^\/messages\/([^\/]+)$/) && isGetOrHead) {
      const match = pathname.match(/^\/messages\/([^\/]+)$/);
      await routes.showDiscussions(ctx, decodeURIComponent(match[1]));
    }
    // 16. Send Message into Thread (POST)
    else if (pathname.match(/^\/messages\/([^\/]+)$/) && method === 'POST') {
      const match = pathname.match(/^\/messages\/([^\/]+)$/);
      await routes.handleSendChatMessage(ctx, decodeURIComponent(match[1]));
    }
    // 17. Feed: Create Post (POST)
    else if (pathname === '/posts' && method === 'POST') {
      await routes.handleCreatePost(ctx);
    }
    // 18. Feed: Delete Post (POST)
    else if (pathname.match(/^\/posts\/(\d+)\/delete$/) && method === 'POST') {
      const match = pathname.match(/^\/posts\/(\d+)\/delete$/);
      await routes.handleDeletePost(ctx, parseInt(match[1], 10));
    }
    // 19. Games: Play / Tetris (GET)
    else if ((pathname === '/tetris' || pathname === '/play') && isGetOrHead) {
      await routes.showTetris(ctx);
    }
    // Fallback 404
    else {
      ctx.status = 404;
      ctx.body = 'Not Found';
    }

    // If redirect or response was already sent
    if (res.writableEnded) {
      console.log(`  <-- ${method} ${pathname} ${res.statusCode} ${Date.now() - start}ms`);
      return;
    }

    // Send response
    if (ctx.type && !res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', ctx.type);
    }
    res.statusCode = ctx.status || 200;

    if (method === 'HEAD') {
      res.end();
    } else if (Buffer.isBuffer(ctx.body)) {
      res.end(ctx.body);
    } else if (typeof ctx.body === 'string') {
      res.end(ctx.body);
    } else if (ctx.body !== null && ctx.body !== undefined) {
      res.end(JSON.stringify(ctx.body));
    } else {
      res.end();
    }

    console.log(`  <-- ${method} ${pathname} ${res.statusCode} ${Date.now() - start}ms`);
  } catch (err) {
    console.error('Server error:', err);
    if (!res.writableEnded) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  }
});

// Parse port from environment variable or command-line arguments:
// Supports: PORT=5000, node app.js 5000, -p 5000, --port 5000, --port=5000
function getPort() {
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '-p' || arg === '--port') && args[i + 1]) {
      const p = parseInt(args[i + 1], 10);
      if (!isNaN(p)) return p;
    }
    if (arg.startsWith('--port=')) {
      const p = parseInt(arg.split('=')[1], 10);
      if (!isNaN(p)) return p;
    }
    if (/^\d+$/.test(arg)) {
      const p = parseInt(arg, 10);
      if (!isNaN(p)) return p;
    }
  }

  return 4000;
}

// Start server with automatic collision fallback (tries port + 1 if in use)
function startServer(initialPort) {
  let currentPort = initialPort;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${currentPort} is already in use. Retrying on port ${currentPort + 1}...`);
      currentPort++;
      server.listen(currentPort);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(currentPort, () => {
    console.log(`Server is running on http://localhost:${currentPort}`);
  });
}

const initialPort = getPort();
startServer(initialPort);
