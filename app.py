import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import mimetypes
from datetime import datetime

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "psych101.db")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
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
    """)
    cursor.execute("""
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
    """)
    cursor.execute("SELECT COUNT(*) as count FROM cards")
    count = cursor.fetchone()["count"]
    if count == 0:
        seed_questions(conn)
    conn.commit()
    conn.close()

def seed_questions(conn):
    questions_file = os.path.join(BASE_DIR, "data", "questions.json")
    if not os.path.exists(questions_file):
        return
    with open(questions_file, "r", encoding="utf-8") as f:
        questions = json.load(f)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cards;")
    for q in questions:
        cursor.execute("""
        INSERT INTO cards (id, category, difficulty, question, answer, explanation, options, correct_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q["id"], q["category"], q["difficulty"], q["question"],
            q["answer"], q["explanation"], json.dumps(q["options"]), q["correct_index"]
        ))
    conn.commit()

def format_card(row):
    return {
        "id": row["id"],
        "category": row["category"],
        "difficulty": row["difficulty"],
        "question": row["question"],
        "answer": row["answer"],
        "explanation": row["explanation"],
        "options": json.loads(row["options"]),
        "correct_index": row["correct_index"],
        "is_mastered": bool(row["is_mastered"]),
        "times_reviewed": row["times_reviewed"],
        "times_correct": row["times_correct"],
        "is_starred": bool(row["is_starred"]),
        "last_reviewed_at": row["last_reviewed_at"]
    }

class PsychAppHandler(http.server.BaseHTTPRequestHandler):
    def send_json(self, status_code, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        pathname = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if pathname.startswith("/api/"):
            conn = get_db()
            cursor = conn.cursor()

            if pathname == "/api/cards":
                cat = params.get("category", ["All"])[0]
                status = params.get("status", ["all"])[0]
                query = "SELECT * FROM cards WHERE 1=1"
                q_params = []
                if cat != "All":
                    query += " AND category = ?"
                    q_params.append(cat)
                if status == "starred":
                    query += " AND is_starred = 1"
                elif status == "mastered":
                    query += " AND is_mastered = 1"
                elif status == "learning":
                    query += " AND is_mastered = 0"
                query += " ORDER BY id ASC"
                cursor.execute(query, q_params)
                cards = [format_card(r) for r in cursor.fetchall()]
                conn.close()
                return self.send_json(200, {"cards": cards, "count": len(cards)})

            elif pathname == "/api/categories":
                cursor.execute("""
                    SELECT category, COUNT(*) as total, SUM(is_mastered) as mastered
                    FROM cards GROUP BY category ORDER BY category ASC
                """)
                categories = [{"category": r["category"], "total": r["total"], "mastered": r["mastered"] or 0} for r in cursor.fetchall()]
                conn.close()
                return self.send_json(200, {"categories": categories})

            elif pathname == "/api/stats":
                cursor.execute("""
                    SELECT
                      COUNT(*) as totalCards,
                      SUM(CASE WHEN is_mastered = 1 THEN 1 ELSE 0 END) as masteredCards,
                      SUM(CASE WHEN times_reviewed > 0 AND is_mastered = 0 THEN 1 ELSE 0 END) as learningCards,
                      SUM(CASE WHEN times_reviewed = 0 THEN 1 ELSE 0 END) as unreviewedCards,
                      SUM(is_starred) as starredCards,
                      SUM(times_reviewed) as totalCardReviews
                    FROM cards
                """)
                card_sum = dict(cursor.fetchone())
                cursor.execute("""
                    SELECT COUNT(*) as testsCompleted, AVG(percentage) as averageScore, MAX(percentage) as highScore
                    FROM test_results
                """)
                test_row = cursor.fetchone()
                test_sum = {
                    "testsCompleted": test_row["testsCompleted"] or 0,
                    "averageScore": round(test_row["averageScore"]) if test_row["averageScore"] else 0,
                    "highScore": test_row["highScore"] or 0
                }
                cursor.execute("SELECT category, COUNT(*) as total, SUM(is_mastered) as mastered FROM cards GROUP BY category ORDER BY category ASC")
                cats = [{"category": r["category"], "total": r["total"], "mastered": r["mastered"] or 0} for r in cursor.fetchall()]
                conn.close()
                return self.send_json(200, {"cards": card_sum, "tests": test_sum, "categories": cats})

            elif pathname == "/api/quiz":
                count = int(params.get("count", ["10"])[0])
                cat = params.get("category", ["All"])[0]
                query = "SELECT * FROM cards WHERE 1=1"
                q_params = []
                if cat != "All":
                    query += " AND category = ?"
                    q_params.append(cat)
                query += " ORDER BY RANDOM() LIMIT ?"
                q_params.append(count)
                cursor.execute(query, q_params)
                questions = [format_card(r) for r in cursor.fetchall()]
                conn.close()
                return self.send_json(200, {"questions": questions, "count": len(questions)})

            elif pathname == "/api/quiz/history":
                cursor.execute("SELECT id, taken_at, score, total_questions, percentage, time_taken_seconds, category_breakdown FROM test_results ORDER BY id DESC LIMIT 20")
                history = []
                for r in cursor.fetchall():
                    item = dict(r)
                    item["category_breakdown"] = json.loads(item["category_breakdown"])
                    history.append(item)
                conn.close()
                return self.send_json(200, {"history": history})

            # Check single card
            parts = pathname.strip("/").split("/")
            if len(parts) == 3 and parts[0] == "api" and parts[1] == "cards" and parts[2].isdigit():
                card_id = int(parts[2])
                cursor.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
                row = cursor.fetchone()
                conn.close()
                if row:
                    return self.send_json(200, {"card": format_card(row)})
                return self.send_json(404, {"error": "Card not found"})

            conn.close()
            return self.send_json(404, {"error": "API endpoint not found"})

        # Serve static files
        req_path = pathname.lstrip("/")
        if not req_path:
            req_path = "index.html"
        file_path = os.path.normpath(os.path.join(PUBLIC_DIR, req_path))

        if not file_path.startswith(PUBLIC_DIR) or not os.path.isfile(file_path):
            file_path = os.path.join(PUBLIC_DIR, "index.html")

        if os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "application/octet-stream"
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type or "javascript" in mime_type or "json" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        pathname = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        if pathname.startswith("/api/"):
            conn = get_db()
            cursor = conn.cursor()

            if pathname == "/api/cards/reset":
                cursor.execute("UPDATE cards SET is_mastered = 0, times_reviewed = 0, times_correct = 0, is_starred = 0, last_reviewed_at = NULL")
                cursor.execute("DELETE FROM test_results")
                conn.commit()
                conn.close()
                return self.send_json(200, {"success": True, "message": "All progress reset"})

            elif pathname == "/api/quiz/submit":
                answers = body.get("answers", [])
                time_taken = body.get("timeTakenSeconds", 0)
                now = datetime.now().isoformat()
                correct_count = 0
                cat_stats = {}
                detailed = []

                for item in answers:
                    c_id = item.get("cardId")
                    s_idx = item.get("selectedIndex")
                    cursor.execute("SELECT * FROM cards WHERE id = ?", (c_id,))
                    row = cursor.fetchone()
                    if not row:
                        continue
                    card = format_card(row)
                    is_correct = (s_idx == card["correct_index"])
                    if is_correct:
                        correct_count += 1

                    cat = card["category"]
                    if cat not in cat_stats:
                        cat_stats[cat] = {"correct": 0, "total": 0}
                    cat_stats[cat]["total"] += 1
                    if is_correct:
                        cat_stats[cat]["correct"] += 1

                    cursor.execute("""
                        UPDATE cards SET times_reviewed = times_reviewed + 1,
                        times_correct = times_correct + ?, last_reviewed_at = ? WHERE id = ?
                    """, (1 if is_correct else 0, now, c_id))

                    detailed.append({
                        "cardId": card["id"],
                        "category": card["category"],
                        "difficulty": card["difficulty"],
                        "question": card["question"],
                        "options": card["options"],
                        "selectedIndex": s_idx,
                        "correctIndex": card["correct_index"],
                        "correctAnswer": card["answer"],
                        "explanation": card["explanation"],
                        "isCorrect": is_correct
                    })

                total_q = len(answers)
                pct = round((correct_count / total_q) * 100) if total_q > 0 else 0
                cursor.execute("""
                    INSERT INTO test_results (taken_at, score, total_questions, percentage, time_taken_seconds, category_breakdown, answers_summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (now, correct_count, total_q, pct, time_taken, json.dumps(cat_stats), json.dumps(detailed)))
                conn.commit()
                test_id = cursor.lastrowid
                conn.close()

                return self.send_json(200, {
                    "testId": test_id,
                    "takenAt": now,
                    "score": correct_count,
                    "totalQuestions": total_q,
                    "percentage": pct,
                    "timeTakenSeconds": time_taken,
                    "categoryBreakdown": cat_stats,
                    "detailedResults": detailed
                })

            parts = pathname.strip("/").split("/")
            if len(parts) >= 3 and parts[0] == "api" and parts[1] == "cards" and parts[2].isdigit():
                card_id = int(parts[2])
                action = parts[3] if len(parts) > 3 else None

                if action == "progress":
                    is_mastered = 1 if body.get("isMastered") else 0
                    is_correct = 1 if body.get("isCorrect") else 0
                    now = datetime.now().isoformat()
                    cursor.execute("""
                        UPDATE cards SET is_mastered = ?, times_reviewed = times_reviewed + 1,
                        times_correct = times_correct + ?, last_reviewed_at = ? WHERE id = ?
                    """, (is_mastered, is_correct, now, card_id))
                    conn.commit()
                    cursor.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
                    row = cursor.fetchone()
                    conn.close()
                    return self.send_json(200, {"card": format_card(row)})

                elif action == "star":
                    cursor.execute("SELECT is_starred FROM cards WHERE id = ?", (card_id,))
                    row = cursor.fetchone()
                    if row:
                        new_star = 0 if row["is_starred"] else 1
                        cursor.execute("UPDATE cards SET is_starred = ? WHERE id = ?", (new_star, card_id))
                        conn.commit()
                        cursor.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
                        updated = cursor.fetchone()
                        conn.close()
                        return self.send_json(200, {"card": format_card(updated)})

            conn.close()
            return self.send_json(404, {"error": "API route not found"})

if __name__ == "__main__":
    init_db()
    with socketserver.TCPServer(("", PORT), PsychAppHandler) as httpd:
        print(f"🧠 Psychology 101 Flashcard App (Python Runner)")
        print(f"🌐 Local URL: http://localhost:{PORT}")
        print(f"📚 Database: psych101.db (SQLite)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
