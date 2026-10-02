import { getDb, seedQuestions } from './db.js';

console.log('Seeding Psychology 101 database...');
try {
  const db = getDb();
  const count = seedQuestions(db);
  console.log(`Successfully seeded ${count} Psychology 101 flashcards and practice test questions into psych101.db!`);
} catch (err) {
  console.error('Failed to seed database:', err);
  process.exit(1);
}
