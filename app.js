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

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
      return resolve({});
    }

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try {
          return resolve(JSON.parse(raw));
        } catch {
          return resolve({});
        }
      }

      // Default to urlencoded form data
      const parsed = {};
      const params = new URLSearchParams(raw);
      for (const [key, value] of params.entries()) {
        parsed[key] = value;
      }
      resolve(parsed);
    });
  });
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
  const body = await parseBody(req);

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

    // 2. Favicon
    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 3. Theme assets: /themes/:theme/:file
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
    // 5. Home
    else if (pathname === '/' && isGetOrHead) {
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
    // 9. People / Profile
    else if ((pathname === '/people' || pathname === '/profile') && isGetOrHead) {
      await routes.listUsers(ctx);
    }
    // 10. Fallback 404
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

// Start the server
let port = process.env.PORT || 4000;
const portIndex = process.argv.indexOf('-p');
if (portIndex > -1 && process.argv[portIndex + 1]) {
  port = Number(process.argv[portIndex + 1]);
}

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
