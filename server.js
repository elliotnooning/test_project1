import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getDb,
  getAllCards,
  getCardById,
  updateCardProgress,
  toggleCardStar,
  resetAllProgress,
  getCategories,
  getPracticeQuiz,
  submitPracticeQuiz,
  getQuizHistory,
  getOverallStats
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

// Ensure DB is ready
getDb();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      // GET /api/cards
      if (pathname === '/api/cards' && method === 'GET') {
        const category = parsedUrl.searchParams.get('category') || 'All';
        const status = parsedUrl.searchParams.get('status') || 'all';
        const cards = getAllCards(category, status);
        return sendJson(res, 200, { cards, count: cards.length });
      }

      // GET /api/categories
      if (pathname === '/api/categories' && method === 'GET') {
        const categories = getCategories();
        return sendJson(res, 200, { categories });
      }

      // GET /api/stats
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = getOverallStats();
        return sendJson(res, 200, stats);
      }

      // GET /api/quiz
      if (pathname === '/api/quiz' && method === 'GET') {
        const count = parseInt(parsedUrl.searchParams.get('count') || '10', 10);
        const category = parsedUrl.searchParams.get('category') || 'All';
        const questions = getPracticeQuiz(count, category);
        return sendJson(res, 200, { questions, count: questions.length });
      }

      // POST /api/quiz/submit
      if (pathname === '/api/quiz/submit' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.answers || !Array.isArray(body.answers)) {
          return sendError(res, 400, 'Invalid submission: "answers" array required.');
        }
        const timeTaken = typeof body.timeTakenSeconds === 'number' ? body.timeTakenSeconds : 0;
        const result = submitPracticeQuiz(body.answers, timeTaken);
        return sendJson(res, 200, result);
      }

      // GET /api/quiz/history
      if (pathname === '/api/quiz/history' && method === 'GET') {
        const history = getQuizHistory();
        return sendJson(res, 200, { history });
      }

      // POST /api/cards/reset
      if (pathname === '/api/cards/reset' && method === 'POST') {
        const result = resetAllProgress();
        return sendJson(res, 200, result);
      }

      // Card specific routes: /api/cards/:id/progress, /api/cards/:id/star, /api/cards/:id
      const cardMatch = pathname.match(/^\/api\/cards\/(\d+)(?:\/(progress|star))?$/);
      if (cardMatch) {
        const cardId = parseInt(cardMatch[1], 10);
        const action = cardMatch[2];

        if (!action && method === 'GET') {
          const card = getCardById(cardId);
          if (!card) return sendError(res, 404, 'Card not found');
          return sendJson(res, 200, { card });
        }

        if (action === 'progress' && method === 'POST') {
          const body = await parseBody(req);
          const updated = updateCardProgress(cardId, body.isMastered, body.isCorrect);
          if (!updated) return sendError(res, 404, 'Card not found');
          return sendJson(res, 200, { card: updated });
        }

        if (action === 'star' && method === 'POST') {
          const updated = toggleCardStar(cardId);
          if (!updated) return sendError(res, 404, 'Card not found');
          return sendJson(res, 200, { card: updated });
        }
      }

      return sendError(res, 404, 'API endpoint not found');
    }

    // Static File Serving
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safePath);

    // Security check to avoid directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return sendError(res, 403, 'Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA if not found
        const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(fallbackPath, (fallbackErr, data) => {
          if (fallbackErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(data);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });

  } catch (error) {
    console.error('Server error:', error);
    sendError(res, 500, error.message || 'Internal Server Error');
  }
});

// If executed directly, listen on port
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`🧠 Psychology 101 Flashcard App is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📚 Database: psych101.db (SQLite)`);
    console.log(`Press Ctrl+C to stop.`);
  });
}

export default server;
