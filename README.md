# 🧠 Psychology 101 — Flashcards & Practice Test Web App

A full-featured Psychology 101 study platform built with a local **SQLite** database (`psych101.db`), containing **50 curated introductory psychology questions** covering all foundational domains. Features interactive **Learning Mode (Flashcards)** and an exam-style **Practice Test Mode** with real-time scoring, category analytics, and progress tracking.

---

## 🚀 How to Run Locally

You can run the web app using either **Node.js** or **Python 3**. Both require **zero external package installations** because they use standard built-in modules (`node:sqlite` / `sqlite3` and built-in HTTP servers).

### Option 1: Run with Node.js (Recommended)

1. Open PowerShell or Terminal in the project directory:
   ```powershell
   cd c:\Users\ellio\dev\test_project1
   ```

2. Start the web application:
   ```powershell
   npm start
   ```
   *(or `node server.js`)*

3. Open your browser to:
   ```
   http://localhost:3000
   ```

---

### Option 2: Run with Python 3

1. Open PowerShell or Terminal in the project directory:
   ```powershell
   cd c:\Users\ellio\dev\test_project1
   ```

2. Start the server:
   ```powershell
   python app.py
   ```

3. Open your browser to:
   ```
   http://localhost:3000
   ```

---

## 🗄️ Database Management

The local SQLite database (`psych101.db`) comes pre-seeded with 50 Psychology 101 questions. If you ever want to re-seed or reset it to the default dataset:

```powershell
npm run seed
```
*(or `node seed.js`)*

---

## ✨ Features & Architecture

### 1. 📇 Learning Mode (Flashcards)
- **Smooth 3D Card Flip**: Click or press <kbd>Space</kbd> to flip between question/concept and detailed answer.
- **In-Depth Explanations**: Every card includes academic definitions, psychological context, and real-world examples.
- **Mastery Tracking**: Mark cards as **"Mastered"** or **"Still Learning"**; progress persists to SQLite.
- **Audio Read-Aloud**: Built-in speech synthesis (<kbd>🔊</kbd>) reads questions and explanations aloud.
- **Deck Controls**: Filter by category (10 domains), filter by status (Mastered, Learning, Starred), or shuffle the deck.
- **Keyboard Shortcuts**:
  - <kbd>Space</kbd> / <kbd>Enter</kbd>: Flip card
  - <kbd>→</kbd> / <kbd>J</kbd>: Next card
  - <kbd>←</kbd> / <kbd>K</kbd>: Previous card
  - <kbd>1</kbd>: Mark "Still Learning"
  - <kbd>2</kbd>: Mark "Mastered"
  - <kbd>S</kbd>: Star / Favorite card
  - <kbd>R</kbd>: Shuffle deck

### 2. 📝 Practice Test Mode
- **Customizable Tests**: Choose 10, 25, or all 50 questions, filter by domain, and set untimed or timed mode (45s or 60s per question).
- **Exam vs. Instant Feedback**: Choose between formal exam mode (results revealed upon completion) or immediate feedback mode.
- **Interactive Question Navigator**: Jump between questions, flag questions for review, and track answered vs unanswered items.
- **Comprehensive Scorecard**:
  - Letter grade ($A, B, C, D, F$) and percentage score.
  - Celebratory confetti celebration for scores $\ge 80\%$.
  - **Domain Performance Breakdown**: Bar charts showing your accuracy per psychology category.
  - **Question-by-Question Review**: Side-by-side comparison of your answer vs. the correct answer with full explanations.
  - **"Study Missed Cards" Button**: Instantly loads only your incorrect test questions into Learning Mode for targeted remediation.

### 3. 📊 Stats & Progress Dashboard
- Overview of mastered cards ($X / 50$), overall readiness percentage, practice test high score, and total reviews.
- **Category Mastery Matrix**: Visual progress tracking across all 10 psychology domains.
- **SQLite History Log**: Tracks all completed practice tests with timestamps, scores, and duration.
- **Data Reset**: Reset all review counts and test attempts anytime.

---

## 📚 Psychology 101 Domains Covered (50 Questions)
1. **History & Approaches** (Wilhelm Wundt, Structuralism, Functionalism)
2. **Research Methods** (Independent/Dependent variables, Controlled experiments, Double-blind studies, Correlation vs Causation)
3. **Biological Bases of Behavior** (Neuron anatomy, Action potentials, Neurotransmitters, Brain lobes, Corpus callosum, Sympathetic/Parasympathetic system, Thalamus)
4. **Sensation & Perception** (Absolute threshold, Rods vs Cones, Opponent-process theory, Gestalt principles, Top-down vs Bottom-up processing)
5. **Learning & Conditioning** (Classical conditioning, UCS/CS, Operant conditioning, Positive/Negative reinforcement & punishment, Schedules of reinforcement, Bobo doll experiment)
6. **Memory & Cognition** (Atkinson-Shiffrin model, Miller's $7 \pm 2$, Procedural vs Declarative memory, Proactive interference, Availability heuristic, Hippocampus consolidation)
7. **Developmental Psychology** (Piaget's stages, Conservation, Object permanence, Erikson's psychosocial crises, Ainsworth's attachment styles, Kohlberg's moral development)
8. **Motivation & Emotion** (Maslow's hierarchy of needs, Drive-reduction theory, Schachter-Singer two-factor theory, Overjustification effect)
9. **Social Psychology** (Fundamental attribution error, Asch conformity experiments, Milgram obedience study, Bystander effect & diffusion of responsibility, Cognitive dissonance, Social loafing)
10. **Personality & Clinical** (Freud's Id/Ego/Superego, Big Five OCEAN traits, DSM-5 diagnostic criteria, GAD, Bipolar I disorder, Cognitive Behavioral Therapy)
