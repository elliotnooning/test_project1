import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'psych101.db');
const QUESTIONS_PATH = path.join(__dirname, 'data', 'questions.json');

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initTables(dbInstance);
  }
  return dbInstance;
}

function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      is_mastered INTEGER DEFAULT 0,
      times_reviewed INTEGER DEFAULT 0,
      times_correct INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      last_reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taken_at TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage REAL NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      category_breakdown TEXT NOT NULL,
      answers_summary TEXT NOT NULL
    );
  `);

  // Check if cards need seeding
  const countRow = db.prepare('SELECT COUNT(*) as count FROM cards').get();
  if (!countRow || countRow.count === 0) {
    seedQuestions(db);
  }
}

export function seedQuestions(db = getDb()) {
  const rawData = fs.readFileSync(QUESTIONS_PATH, 'utf-8');
  const questions = JSON.parse(rawData);

  db.exec('DELETE FROM cards;');

  const insertStmt = db.prepare(`
    INSERT INTO cards (id, category, difficulty, question, answer, explanation, options, correct_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of questions) {
    insertStmt.run(
      q.id,
      q.category,
      q.difficulty,
      q.question,
      q.answer,
      q.explanation,
      JSON.stringify(q.options),
      q.correct_index
    );
  }

  return questions.length;
}

export function getAllCards(category = 'All', status = 'all') {
  const db = getDb();
  let query = 'SELECT * FROM cards WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (status === 'starred') {
    query += ' AND is_starred = 1';
  } else if (status === 'mastered') {
    query += ' AND is_mastered = 1';
  } else if (status === 'learning') {
    query += ' AND is_mastered = 0';
  }

  query += ' ORDER BY id ASC';

  const rows = db.prepare(query).all(...params);
  return rows.map(formatCardRow);
}

export function getCardById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  return row ? formatCardRow(row) : null;
}

export function updateCardProgress(id, isMastered, isCorrect = null) {
  const db = getDb();
  const now = new Date().toISOString();
  const card = getCardById(id);
  if (!card) return null;

  const newReviewed = (card.times_reviewed || 0) + 1;
  const newCorrect = (card.times_correct || 0) + (isCorrect ? 1 : 0);
  const masteredVal = isMastered ? 1 : 0;

  db.prepare(`
    UPDATE cards
    SET is_mastered = ?, times_reviewed = ?, times_correct = ?, last_reviewed_at = ?
    WHERE id = ?
  `).run(masteredVal, newReviewed, newCorrect, now, id);

  return getCardById(id);
}

export function toggleCardStar(id) {
  const db = getDb();
  const card = getCardById(id);
  if (!card) return null;

  const newStar = card.is_starred ? 0 : 1;
  db.prepare('UPDATE cards SET is_starred = ? WHERE id = ?').run(newStar, id);
  return { ...card, is_starred: newStar };
}

export function resetAllProgress() {
  const db = getDb();
  db.exec(`
    UPDATE cards
    SET is_mastered = 0, times_reviewed = 0, times_correct = 0, is_starred = 0, last_reviewed_at = NULL;
    DELETE FROM test_results;
  `);
  return { success: true, message: 'All progress and test records reset.' };
}

export function getCategories() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT category,
           COUNT(*) as total,
           SUM(is_mastered) as mastered
    FROM cards
    GROUP BY category
    ORDER BY category ASC
  `).all();
  return rows;
}

export function getPracticeQuiz(count = 10, category = 'All') {
  const db = getDb();
  let query = 'SELECT * FROM cards WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY RANDOM() LIMIT ?';
  params.push(count);

  const rows = db.prepare(query).all(...params);
  return rows.map(formatCardRow);
}

export function submitPracticeQuiz(answers, timeTakenSeconds = 0) {
  const db = getDb();
  const now = new Date().toISOString();

  let correctCount = 0;
  const totalQuestions = answers.length;
  const categoryStats = {};
  const detailedResults = [];

  const updateCardStmt = db.prepare(`
    UPDATE cards
    SET times_reviewed = times_reviewed + 1,
        times_correct = times_correct + ?,
        last_reviewed_at = ?
    WHERE id = ?
  `);

  for (const item of answers) {
    const card = getCardById(item.cardId);
    if (!card) continue;

    const isCorrect = item.selectedIndex === card.correct_index;
    if (isCorrect) correctCount++;

    if (!categoryStats[card.category]) {
      categoryStats[card.category] = { correct: 0, total: 0 };
    }
    categoryStats[card.category].total++;
    if (isCorrect) categoryStats[card.category].correct++;

    updateCardStmt.run(isCorrect ? 1 : 0, now, card.id);

    detailedResults.push({
      cardId: card.id,
      category: card.category,
      difficulty: card.difficulty,
      question: card.question,
      options: card.options,
      selectedIndex: item.selectedIndex,
      correctIndex: card.correct_index,
      correctAnswer: card.answer,
      explanation: card.explanation,
      isCorrect
    });
  }

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const insertTestStmt = db.prepare(`
    INSERT INTO test_results (taken_at, score, total_questions, percentage, time_taken_seconds, category_breakdown, answers_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResult = insertTestStmt.run(
    now,
    correctCount,
    totalQuestions,
    percentage,
    timeTakenSeconds,
    JSON.stringify(categoryStats),
    JSON.stringify(detailedResults)
  );

  return {
    testId: insertResult.lastInsertRowid,
    takenAt: now,
    score: correctCount,
    totalQuestions,
    percentage,
    timeTakenSeconds,
    categoryBreakdown: categoryStats,
    detailedResults
  };
}

export function getQuizHistory() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, taken_at, score, total_questions, percentage, time_taken_seconds, category_breakdown
    FROM test_results
    ORDER BY id DESC
    LIMIT 20
  `).all();

  return rows.map(r => ({
    ...r,
    category_breakdown: JSON.parse(r.category_breakdown)
  }));
}

export function getOverallStats() {
  const db = getDb();
  const cardSummary = db.prepare(`
    SELECT
      COUNT(*) as totalCards,
      SUM(CASE WHEN is_mastered = 1 THEN 1 ELSE 0 END) as masteredCards,
      SUM(CASE WHEN times_reviewed > 0 AND is_mastered = 0 THEN 1 ELSE 0 END) as learningCards,
      SUM(CASE WHEN times_reviewed = 0 THEN 1 ELSE 0 END) as unreviewedCards,
      SUM(is_starred) as starredCards,
      SUM(times_reviewed) as totalCardReviews
    FROM cards
  `).get();

  const testSummary = db.prepare(`
    SELECT
      COUNT(*) as testsCompleted,
      AVG(percentage) as averageScore,
      MAX(percentage) as highScore
    FROM test_results
  `).get();

  const categories = getCategories();

  return {
    cards: cardSummary,
    tests: {
      testsCompleted: testSummary.testsCompleted || 0,
      averageScore: testSummary.averageScore ? Math.round(testSummary.averageScore) : 0,
      highScore: testSummary.highScore || 0
    },
    categories
  };
}

function formatCardRow(row) {
  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
    correct_index: row.correct_index,
    is_mastered: Boolean(row.is_mastered),
    times_reviewed: row.times_reviewed,
    times_correct: row.times_correct,
    is_starred: Boolean(row.is_starred),
    last_reviewed_at: row.last_reviewed_at
  };
}
