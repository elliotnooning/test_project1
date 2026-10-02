/**
 * Psychology 101 — Flashcard & Practice Test App
 * Frontend Architecture & State Management
 */

// ================= APP STATE =================
const state = {
  currentTab: 'learn',
  theme: localStorage.getItem('psych_theme') || 'dark',
  ttsEnabled: localStorage.getItem('psych_tts') === 'true',

  // Flashcards state
  cards: [],
  currentCardIndex: 0,
  isFlipped: false,
  filterCategory: 'All',
  filterStatus: 'all',
  categories: [],

  // Practice Test state
  quiz: {
    questions: [],
    currentIndex: 0,
    userAnswers: {}, // index -> selectedOptionIndex
    flagged: new Set(),
    mode: 'exam', // 'exam' or 'instant'
    timerSeconds: 0,
    timerInterval: null,
    timeRemaining: 0,
    timeElapsed: 0,
    isCompleted: false,
    results: null
  },

  // Stats state
  stats: null,
  history: []
};

// ================= DOM ELEMENTS =================
const elements = {
  // Theme & TTS
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  ttsToggle: document.getElementById('tts-toggle'),
  ttsIcon: document.getElementById('tts-icon'),

  // Tabs
  navTabs: document.querySelectorAll('.nav-tab'),
  tabViews: document.querySelectorAll('.tab-view'),

  // Flashcards UI
  flashcard: document.getElementById('flashcard'),
  cardCategory: document.getElementById('card-category'),
  cardDifficulty: document.getElementById('card-difficulty'),
  cardCategoryBack: document.getElementById('card-category-back'),
  cardQuestionFront: document.getElementById('card-question-front'),
  cardAnswerBack: document.getElementById('card-answer-back'),
  cardExplanationText: document.getElementById('card-explanation-text'),
  btnStarCard: document.getElementById('btn-star-card'),
  btnStarCardBack: document.getElementById('btn-star-card-back'),
  btnSpeakQuestion: document.getElementById('btn-speak-question'),
  btnSpeakAnswer: document.getElementById('btn-speak-answer'),

  categoryFilter: document.getElementById('category-filter'),
  statusFilter: document.getElementById('status-filter'),
  btnShuffle: document.getElementById('btn-shuffle'),
  btnShortcutsModal: document.getElementById('btn-shortcuts-modal'),
  shortcutsModal: document.getElementById('shortcuts-modal'),
  btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
  btnModalGotit: document.getElementById('btn-modal-gotit'),

  currentCardIdxText: document.getElementById('current-card-idx'),
  totalCardsIdxText: document.getElementById('total-cards-idx'),
  learningProgressBar: document.getElementById('learning-progress-bar'),
  statMasteredCount: document.getElementById('stat-mastered-count'),
  statLearningCount: document.getElementById('stat-learning-count'),

  btnPrevCard: document.getElementById('btn-prev-card'),
  btnNextCard: document.getElementById('btn-next-card'),
  btnFlipCard: document.getElementById('btn-flip-card'),
  btnMarkLearning: document.getElementById('btn-mark-learning'),
  btnMarkMastered: document.getElementById('btn-mark-mastered'),

  // Practice Test UI
  quizConfigPanel: document.getElementById('quiz-config-panel'),
  quizActivePanel: document.getElementById('quiz-active-panel'),
  quizResultPanel: document.getElementById('quiz-result-panel'),
  quizSetupForm: document.getElementById('quiz-setup-form'),
  quizCategorySelect: document.getElementById('quiz-category'),
  quizTimerSelect: document.getElementById('quiz-timer'),

  quizQCurrent: document.getElementById('quiz-q-current'),
  quizQTotal: document.getElementById('quiz-q-total'),
  quizProgressBar: document.getElementById('quiz-progress-bar'),
  quizTimerBadge: document.getElementById('quiz-timer-badge'),
  quizTimerDisplay: document.getElementById('quiz-timer-display'),
  btnFlagQuestion: document.getElementById('btn-flag-question'),
  flagIcon: document.getElementById('flag-icon'),

  quizGridNavigator: document.getElementById('quiz-grid-navigator'),
  quizQuestionCat: document.getElementById('quiz-question-cat'),
  quizQuestionDiff: document.getElementById('quiz-question-diff'),
  quizQuestionText: document.getElementById('quiz-question-text'),
  quizOptionsContainer: document.getElementById('quiz-options-container'),
  instantFeedbackBox: document.getElementById('instant-feedback-box'),
  feedbackBadge: document.getElementById('feedback-badge'),
  feedbackExplanation: document.getElementById('feedback-explanation'),

  btnQuizPrev: document.getElementById('btn-quiz-prev'),
  btnQuizNext: document.getElementById('btn-quiz-next'),
  btnClearChoice: document.getElementById('btn-clear-choice'),
  btnQuizSubmit: document.getElementById('btn-quiz-submit'),

  // Test Results
  scoreCircle: document.getElementById('score-circle'),
  resultPercent: document.getElementById('result-percent'),
  resultGrade: document.getElementById('result-grade'),
  resultHeadline: document.getElementById('result-headline'),
  resultSubtext: document.getElementById('result-subtext'),
  resultTime: document.getElementById('result-time'),
  resultAccuracy: document.getElementById('result-accuracy'),
  quizCategoryBreakdown: document.getElementById('quiz-category-breakdown'),
  reviewQuestionsContainer: document.getElementById('review-questions-container'),
  revCountAll: document.getElementById('rev-count-all'),
  revCountWrong: document.getElementById('rev-count-wrong'),
  revCountRight: document.getElementById('rev-count-right'),
  btnRetakeQuiz: document.getElementById('btn-retake-quiz'),
  btnStudyMissed: document.getElementById('btn-study-missed'),
  confettiCanvas: document.getElementById('confetti-canvas'),

  // Stats Dashboard
  dashMasteredCount: document.getElementById('dash-mastered-count'),
  dashMasteredPct: document.getElementById('dash-mastered-pct'),
  dashLearningCount: document.getElementById('dash-learning-count'),
  dashHighScore: document.getElementById('dash-high-score'),
  dashTestsCount: document.getElementById('dash-tests-count'),
  dashStarredCount: document.getElementById('dash-starred-count'),
  dashCategoryGrid: document.getElementById('dash-category-grid'),
  historyTableBody: document.getElementById('history-table-body'),
  btnResetData: document.getElementById('btn-reset-data'),
  toastContainer: document.getElementById('toast-container')
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTTS();
  initNavigation();
  initFlashcardEvents();
  initQuizEvents();
  initStatsEvents();
  initKeyboardShortcuts();

  // Load initial data
  loadCategories();
  loadCards();
});

// ================= TOAST NOTIFICATION =================
function showToast(message, icon = 'ℹ️') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ================= THEME & AUDIO =================
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();

  elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('psych_theme', state.theme);
    updateThemeIcon();
  });
}

function updateThemeIcon() {
  elements.themeIcon.textContent = state.theme === 'dark' ? '🌙' : '☀️';
}

function initTTS() {
  updateTTSIcon();
  elements.ttsToggle.addEventListener('click', () => {
    state.ttsEnabled = !state.ttsEnabled;
    localStorage.setItem('psych_tts', state.ttsEnabled);
    updateTTSIcon();
    showToast(state.ttsEnabled ? 'Speech audio enabled' : 'Speech audio disabled', '🔊');
  });
}

function updateTTSIcon() {
  elements.ttsIcon.textContent = state.ttsEnabled ? '🔊' : '🔇';
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech not supported in this browser', '⚠️');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ================= NAVIGATION =================
function initNavigation() {
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;

  elements.navTabs.forEach(t => {
    const isActive = t.getAttribute('data-tab') === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  elements.tabViews.forEach(v => {
    v.classList.toggle('active', v.id === `view-${tabName}`);
  });

  if (tabName === 'stats') {
    loadStatsAndHistory();
  } else if (tabName === 'learn') {
    renderCurrentCard();
  }
}

// ================= API CALLS =================
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message, '⚠️');
    throw error;
  }
}

async function loadCategories() {
  try {
    const data = await apiFetch('/api/categories');
    state.categories = data.categories || [];
    populateCategoryDropdowns();
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

function populateCategoryDropdowns() {
  const filters = [elements.categoryFilter, elements.quizCategorySelect];
  filters.forEach(select => {
    if (!select) return;
    const isQuiz = select === elements.quizCategorySelect;
    select.innerHTML = isQuiz
      ? '<option value="All">All Categories (Comprehensive Exam)</option>'
      : '<option value="All">All Categories (50 Cards)</option>';

    state.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category;
      opt.textContent = `${c.category} (${c.total} cards)`;
      select.appendChild(opt);
    });
  });
}

// ================= 1. LEARNING MODE (FLASHCARDS) =================
async function loadCards() {
  try {
    const params = new URLSearchParams();
    if (state.filterCategory !== 'All') params.set('category', state.filterCategory);
    if (state.filterStatus !== 'all') params.set('status', state.filterStatus);

    const data = await apiFetch(`/api/cards?${params.toString()}`);
    state.cards = data.cards || [];
    state.currentCardIndex = 0;
    state.isFlipped = false;

    renderDeckProgress();
    renderCurrentCard();
  } catch (err) {
    console.error('Failed to load cards', err);
  }
}

function renderCurrentCard() {
  elements.flashcard.classList.remove('is-flipped');
  state.isFlipped = false;

  if (state.cards.length === 0) {
    elements.cardCategory.textContent = 'No Cards Found';
    elements.cardDifficulty.textContent = '--';
    elements.cardQuestionFront.textContent = 'No cards match the selected filter. Try choosing "All Categories" or "All Cards".';
    elements.cardAnswerBack.textContent = '';
    elements.cardExplanationText.textContent = '';
    elements.currentCardIdxText.textContent = '0';
    elements.totalCardsIdxText.textContent = '0';
    elements.learningProgressBar.style.width = '0%';
    return;
  }

  const card = state.cards[state.currentCardIndex];
  if (!card) return;

  // Front
  elements.cardCategory.textContent = card.category;
  elements.cardDifficulty.textContent = card.difficulty;
  elements.cardQuestionFront.textContent = card.question;

  // Back
  elements.cardCategoryBack.textContent = card.category;
  elements.cardAnswerBack.textContent = card.answer;
  elements.cardExplanationText.textContent = card.explanation;

  // Star status
  const starSymbol = card.is_starred ? '★' : '☆';
  elements.btnStarCard.textContent = starSymbol;
  elements.btnStarCardBack.textContent = starSymbol;
  elements.btnStarCard.classList.toggle('active-star', !!card.is_starred);
  elements.btnStarCardBack.classList.toggle('active-star', !!card.is_starred);

  // Deck counters
  elements.currentCardIdxText.textContent = state.currentCardIndex + 1;
  elements.totalCardsIdxText.textContent = state.cards.length;

  const pct = Math.round(((state.currentCardIndex + 1) / state.cards.length) * 100);
  elements.learningProgressBar.style.width = `${pct}%`;

  renderDeckProgress();

  if (state.ttsEnabled) {
    speakText(card.question);
  }
}

function renderDeckProgress() {
  const mastered = state.cards.filter(c => c.is_mastered).length;
  const learning = state.cards.filter(c => !c.is_mastered && c.times_reviewed > 0).length;

  elements.statMasteredCount.textContent = mastered;
  elements.statLearningCount.textContent = learning;
}

function flipCard() {
  if (state.cards.length === 0) return;
  state.isFlipped = !state.isFlipped;
  elements.flashcard.classList.toggle('is-flipped', state.isFlipped);

  if (state.isFlipped && state.ttsEnabled) {
    const card = state.cards[state.currentCardIndex];
    if (card) speakText(card.answer);
  }
}

function nextCard() {
  if (state.cards.length === 0) return;
  if (state.currentCardIndex < state.cards.length - 1) {
    state.currentCardIndex++;
  } else {
    state.currentCardIndex = 0; // loop back to first
  }
  renderCurrentCard();
}

function prevCard() {
  if (state.cards.length === 0) return;
  if (state.currentCardIndex > 0) {
    state.currentCardIndex--;
  } else {
    state.currentCardIndex = state.cards.length - 1;
  }
  renderCurrentCard();
}

async function markCardProgress(isMastered) {
  if (state.cards.length === 0) return;
  const currentCard = state.cards[state.currentCardIndex];
  if (!currentCard) return;

  try {
    const res = await apiFetch(`/api/cards/${currentCard.id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ isMastered, isCorrect: isMastered })
    });

    if (res && res.card) {
      state.cards[state.currentCardIndex] = res.card;
      showToast(isMastered ? 'Marked as Mastered! 🎉' : 'Marked for Further Study', isMastered ? '✅' : '⏳');
      nextCard();
    }
  } catch (err) {
    console.error('Failed to update card progress', err);
  }
}

async function toggleStar() {
  if (state.cards.length === 0) return;
  const currentCard = state.cards[state.currentCardIndex];
  if (!currentCard) return;

  try {
    const res = await apiFetch(`/api/cards/${currentCard.id}/star`, { method: 'POST' });
    if (res && res.card) {
      state.cards[state.currentCardIndex] = res.card;
      const isStarred = res.card.is_starred;
      elements.btnStarCard.textContent = isStarred ? '★' : '☆';
      elements.btnStarCardBack.textContent = isStarred ? '★' : '☆';
      elements.btnStarCard.classList.toggle('active-star', isStarred);
      elements.btnStarCardBack.classList.toggle('active-star', isStarred);
      showToast(isStarred ? 'Card starred for review ⭐' : 'Star removed', isStarred ? '⭐' : '☆');
    }
  } catch (err) {
    console.error('Failed to toggle star', err);
  }
}

function shuffleDeck() {
  if (state.cards.length <= 1) return;
  // Fisher-Yates shuffle
  for (let i = state.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.cards[i], state.cards[j]] = [state.cards[j], state.cards[i]];
  }
  state.currentCardIndex = 0;
  renderCurrentCard();
  showToast('Deck shuffled! 🔀', '🔀');
}

function initFlashcardEvents() {
  // Flip events
  elements.flashcard.addEventListener('click', (e) => {
    // Avoid flipping when clicking action buttons on card
    if (e.target.closest('.card-action-btn')) return;
    flipCard();
  });
  elements.btnFlipCard.addEventListener('click', flipCard);

  // Nav buttons
  elements.btnNextCard.addEventListener('click', nextCard);
  elements.btnPrevCard.addEventListener('click', prevCard);

  // Mastery buttons
  elements.btnMarkMastered.addEventListener('click', () => markCardProgress(true));
  elements.btnMarkLearning.addEventListener('click', () => markCardProgress(false));

  // Star & Audio
  elements.btnStarCard.addEventListener('click', (e) => { e.stopPropagation(); toggleStar(); });
  elements.btnStarCardBack.addEventListener('click', (e) => { e.stopPropagation(); toggleStar(); });

  elements.btnSpeakQuestion.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = state.cards[state.currentCardIndex];
    if (card) speakText(card.question);
  });
  elements.btnSpeakAnswer.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = state.cards[state.currentCardIndex];
    if (card) speakText(card.answer);
  });

  // Filters
  elements.categoryFilter.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    loadCards();
  });

  elements.statusFilter.addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    loadCards();
  });

  // Shuffle
  elements.btnShuffle.addEventListener('click', shuffleDeck);

  // Shortcuts Modal
  elements.btnShortcutsModal.addEventListener('click', () => {
    elements.shortcutsModal.classList.remove('hidden');
  });
  elements.btnCloseShortcuts.addEventListener('click', () => {
    elements.shortcutsModal.classList.add('hidden');
  });
  elements.btnModalGotit.addEventListener('click', () => {
    elements.shortcutsModal.classList.add('hidden');
  });
}

// ================= 2. PRACTICE TEST MODE =================
function initQuizEvents() {
  elements.quizSetupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    startPracticeQuiz();
  });

  elements.btnQuizNext.addEventListener('click', nextQuizQuestion);
  elements.btnQuizPrev.addEventListener('click', prevQuizQuestion);
  elements.btnClearChoice.addEventListener('click', clearQuizChoice);
  elements.btnQuizSubmit.addEventListener('click', confirmAndSubmitQuiz);

  elements.btnFlagQuestion.addEventListener('click', toggleFlagQuestion);

  elements.btnRetakeQuiz.addEventListener('click', () => {
    elements.quizResultPanel.classList.add('hidden');
    elements.quizActivePanel.classList.add('hidden');
    elements.quizConfigPanel.classList.remove('hidden');
  });

  elements.btnStudyMissed.addEventListener('click', studyMissedQuestions);

  // Results filter pills
  const filterPills = document.querySelectorAll('.review-filters .filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderQuestionReview(pill.getAttribute('data-filter'));
    });
  });
}

async function startPracticeQuiz() {
  const countRadio = document.querySelector('input[name="quiz-count"]:checked');
  const count = parseInt(countRadio ? countRadio.value : '10', 10);
  const category = elements.quizCategorySelect.value;
  const timerSetting = parseInt(elements.quizTimerSelect.value, 10);
  const feedbackRadio = document.querySelector('input[name="quiz-feedback"]:checked');
  const mode = feedbackRadio ? feedbackRadio.value : 'exam';

  try {
    const data = await apiFetch(`/api/quiz?count=${count}&category=${encodeURIComponent(category)}`);
    if (!data.questions || data.questions.length === 0) {
      showToast('No questions found for this configuration.', '⚠️');
      return;
    }

    state.quiz = {
      questions: data.questions,
      currentIndex: 0,
      userAnswers: {},
      flagged: new Set(),
      mode,
      timerSeconds: timerSetting,
      timerInterval: null,
      timeRemaining: timerSetting > 0 ? timerSetting * data.questions.length : 0,
      timeElapsed: 0,
      isCompleted: false,
      results: null
    };

    // Switch panels
    elements.quizConfigPanel.classList.add('hidden');
    elements.quizResultPanel.classList.add('hidden');
    elements.quizActivePanel.classList.remove('hidden');

    initQuizTimer();
    renderQuizNavigator();
    renderCurrentQuizQuestion();
  } catch (err) {
    console.error('Failed to start quiz', err);
  }
}

function initQuizTimer() {
  if (state.quiz.timerInterval) clearInterval(state.quiz.timerInterval);

  if (state.quiz.timerSeconds > 0) {
    elements.quizTimerBadge.classList.remove('hidden');
    updateTimerDisplay();

    state.quiz.timerInterval = setInterval(() => {
      state.quiz.timeElapsed++;
      state.quiz.timeRemaining--;
      updateTimerDisplay();

      if (state.quiz.timeRemaining <= 0) {
        clearInterval(state.quiz.timerInterval);
        showToast('Time is up! Submitting test automatically.', '⏰');
        submitQuiz();
      }
    }, 1000);
  } else {
    // Untimed mode: count upwards
    elements.quizTimerBadge.classList.remove('hidden');
    state.quiz.timerInterval = setInterval(() => {
      state.quiz.timeElapsed++;
      const mins = Math.floor(state.quiz.timeElapsed / 60);
      const secs = state.quiz.timeElapsed % 60;
      elements.quizTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(state.quiz.timeRemaining / 60);
  const secs = state.quiz.timeRemaining % 60;
  elements.quizTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderQuizNavigator() {
  elements.quizGridNavigator.innerHTML = '';
  state.quiz.questions.forEach((q, idx) => {
    const pill = document.createElement('div');
    pill.className = 'q-nav-pill';
    pill.textContent = idx + 1;
    pill.setAttribute('data-idx', idx);

    if (idx === state.quiz.currentIndex) pill.classList.add('active');
    if (state.quiz.userAnswers[idx] !== undefined) pill.classList.add('answered');
    if (state.quiz.flagged.has(idx)) pill.classList.add('flagged');

    pill.addEventListener('click', () => {
      state.quiz.currentIndex = idx;
      renderCurrentQuizQuestion();
    });

    elements.quizGridNavigator.appendChild(pill);
  });
}

function renderCurrentQuizQuestion() {
  const { questions, currentIndex, userAnswers, flagged, mode } = state.quiz;
  const q = questions[currentIndex];
  if (!q) return;

  // Header info
  elements.quizQCurrent.textContent = currentIndex + 1;
  elements.quizQTotal.textContent = questions.length;
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);
  elements.quizProgressBar.style.width = `${progressPct}%`;

  // Meta info
  elements.quizQuestionCat.textContent = q.category;
  elements.quizQuestionDiff.textContent = q.difficulty;
  elements.quizQuestionText.textContent = q.question;

  // Flag status
  const isFlagged = flagged.has(currentIndex);
  elements.flagIcon.textContent = isFlagged ? '🚩' : '🏳️';
  elements.btnFlagQuestion.classList.toggle('btn-secondary', isFlagged);

  // Render options
  elements.quizOptionsContainer.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  const selectedIdx = userAnswers[currentIndex];

  q.options.forEach((optText, optIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.setAttribute('type', 'button');

    const isSelected = selectedIdx === optIdx;
    if (isSelected) btn.classList.add('selected');

    // In Instant Feedback Mode, show correct/incorrect if answered
    if (mode === 'instant' && selectedIdx !== undefined) {
      if (optIdx === q.correct_index) {
        btn.classList.add('correct-choice');
      } else if (isSelected) {
        btn.classList.add('wrong-choice');
      }
    }

    btn.innerHTML = `
      <span class="opt-letter">${letters[optIdx]}</span>
      <span class="opt-text">${optText}</span>
    `;

    btn.addEventListener('click', () => selectQuizOption(optIdx));
    elements.quizOptionsContainer.appendChild(btn);
  });

  // Instant feedback box
  if (mode === 'instant' && selectedIdx !== undefined) {
    elements.instantFeedbackBox.classList.remove('hidden');
    const isCorrect = selectedIdx === q.correct_index;
    elements.feedbackBadge.className = `feedback-badge ${isCorrect ? 'correct' : 'incorrect'}`;
    elements.feedbackBadge.textContent = isCorrect ? '✅ Correct Answer!' : '❌ Incorrect';
    elements.feedbackExplanation.textContent = q.explanation;
  } else {
    elements.instantFeedbackBox.classList.add('hidden');
  }

  // Update Nav pills
  renderQuizNavigator();

  // Prev / Next button states
  elements.btnQuizPrev.disabled = currentIndex === 0;
  elements.btnQuizNext.style.display = currentIndex === questions.length - 1 ? 'none' : 'inline-flex';
  elements.btnQuizSubmit.style.display = currentIndex === questions.length - 1 ? 'inline-flex' : 'none';
}

function selectQuizOption(optIdx) {
  const { currentIndex, mode } = state.quiz;
  // If instant feedback mode and already answered, don't allow changing
  if (mode === 'instant' && state.quiz.userAnswers[currentIndex] !== undefined) {
    return;
  }

  state.quiz.userAnswers[currentIndex] = optIdx;
  renderCurrentQuizQuestion();
}

function clearQuizChoice() {
  const { currentIndex, mode } = state.quiz;
  if (mode === 'instant') return;
  delete state.quiz.userAnswers[currentIndex];
  renderCurrentQuizQuestion();
}

function toggleFlagQuestion() {
  const { currentIndex, flagged } = state.quiz;
  if (flagged.has(currentIndex)) {
    flagged.delete(currentIndex);
    showToast(`Unflagged Question ${currentIndex + 1}`, '🏳️');
  } else {
    flagged.add(currentIndex);
    showToast(`Flagged Question ${currentIndex + 1} for review`, '🚩');
  }
  renderCurrentQuizQuestion();
}

function nextQuizQuestion() {
  if (state.quiz.currentIndex < state.quiz.questions.length - 1) {
    state.quiz.currentIndex++;
    renderCurrentQuizQuestion();
  }
}

function prevQuizQuestion() {
  if (state.quiz.currentIndex > 0) {
    state.quiz.currentIndex--;
    renderCurrentQuizQuestion();
  }
}

function confirmAndSubmitQuiz() {
  const answeredCount = Object.keys(state.quiz.userAnswers).length;
  const totalCount = state.quiz.questions.length;
  const unanswered = totalCount - answeredCount;

  if (unanswered > 0) {
    const confirmSubmit = confirm(`You have ${unanswered} unanswered question(s). Are you sure you want to finish and submit the test?`);
    if (!confirmSubmit) return;
  }

  submitQuiz();
}

async function submitQuiz() {
  if (state.quiz.timerInterval) clearInterval(state.quiz.timerInterval);

  const answersPayload = state.quiz.questions.map((q, idx) => ({
    cardId: q.id,
    selectedIndex: state.quiz.userAnswers[idx] !== undefined ? state.quiz.userAnswers[idx] : -1
  }));

  try {
    const results = await apiFetch('/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({
        answers: answersPayload,
        timeTakenSeconds: state.quiz.timeElapsed
      })
    });

    state.quiz.results = results;
    renderQuizResults(results);
  } catch (err) {
    console.error('Failed to submit quiz', err);
  }
}

function renderQuizResults(results) {
  elements.quizActivePanel.classList.add('hidden');
  elements.quizResultPanel.classList.remove('hidden');

  // Percentage & Grade
  const pct = results.percentage;
  elements.resultPercent.textContent = `${pct}%`;

  let grade = 'F';
  let headline = 'Keep Studying!';
  if (pct >= 90) { grade = 'A'; headline = 'Outstanding Mastery! 🌟'; }
  else if (pct >= 80) { grade = 'B'; headline = 'Great Job! Solid Foundation 👏'; }
  else if (pct >= 70) { grade = 'C'; headline = 'Good Effort! Keep Reviewing 👍'; }
  else if (pct >= 60) { grade = 'D'; headline = 'Room for Improvement 📖'; }

  elements.resultGrade.textContent = `Grade ${grade}`;
  elements.resultHeadline.textContent = headline;
  elements.resultSubtext.innerHTML = `You answered <strong>${results.score}</strong> out of <strong>${results.totalQuestions}</strong> questions correctly.`;

  // Time & Accuracy
  const mins = Math.floor(results.timeTakenSeconds / 60);
  const secs = results.timeTakenSeconds % 60;
  elements.resultTime.textContent = `${mins}m ${secs.toString().padStart(2, '0')}s`;
  elements.resultAccuracy.textContent = `${pct}%`;

  // Confetti burst on >= 80%
  if (pct >= 80) {
    launchConfetti();
  }

  // Category Breakdown
  renderCategoryBreakdown(results.categoryBreakdown);

  // Question Review List
  renderQuestionReview('all');
}

function renderCategoryBreakdown(breakdown) {
  elements.quizCategoryBreakdown.innerHTML = '';
  Object.keys(breakdown).forEach(catName => {
    const data = breakdown[catName];
    const catPct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

    const row = document.createElement('div');
    row.className = 'category-bar-row';
    row.innerHTML = `
      <div class="category-bar-header">
        <span>${catName}</span>
        <span>${data.correct} / ${data.total} (${catPct}%)</span>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width: ${catPct}%; background: ${catPct >= 80 ? 'var(--success)' : catPct >= 60 ? 'var(--warning)' : 'var(--danger)'};"></div>
      </div>
    `;
    elements.quizCategoryBreakdown.appendChild(row);
  });
}

function renderQuestionReview(filterMode = 'all') {
  if (!state.quiz.results) return;
  const items = state.quiz.results.detailedResults;

  // Filter counts
  const correctCount = items.filter(i => i.isCorrect).length;
  const wrongCount = items.length - correctCount;
  elements.revCountAll.textContent = items.length;
  elements.revCountRight.textContent = correctCount;
  elements.revCountWrong.textContent = wrongCount;

  elements.reviewQuestionsContainer.innerHTML = '';

  const filtered = items.filter(item => {
    if (filterMode === 'correct') return item.isCorrect;
    if (filterMode === 'incorrect') return !item.isCorrect;
    return true;
  });

  if (filtered.length === 0) {
    elements.reviewQuestionsContainer.innerHTML = '<p class="text-center">No questions match this filter.</p>';
    return;
  }

  filtered.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-incorrect'}`;

    const letters = ['A', 'B', 'C', 'D'];
    const userChoiceText = item.selectedIndex >= 0 ? `${letters[item.selectedIndex]}: ${item.options[item.selectedIndex]}` : 'Unanswered';
    const correctChoiceText = `${letters[item.correctIndex]}: ${item.correctAnswer}`;

    div.innerHTML = `
      <div class="review-q-header">
        <span class="category-chip">${item.category}</span>
        <span class="review-status-tag ${item.isCorrect ? 'tag-correct' : 'tag-incorrect'}">
          ${item.isCorrect ? '✓ Correct' : '✕ Missed'}
        </span>
      </div>
      <h4 class="review-q-title">Q: ${item.question}</h4>
      <div class="review-answers-grid">
        ${!item.isCorrect ? `
          <div class="review-ans-pill user-choice-wrong">
            <strong>Your Answer:</strong> ${userChoiceText}
          </div>
        ` : ''}
        <div class="review-ans-pill correct-choice-true">
          <strong>Correct Answer:</strong> ${correctChoiceText}
        </div>
      </div>
      <div class="review-explanation">
        <strong>💡 Key Concept & Explanation:</strong> ${item.explanation}
      </div>
    `;
    elements.reviewQuestionsContainer.appendChild(div);
  });
}

function studyMissedQuestions() {
  if (!state.quiz.results) return;
  const missedIds = new Set(
    state.quiz.results.detailedResults
      .filter(r => !r.isCorrect)
      .map(r => r.cardId)
  );

  if (missedIds.size === 0) {
    showToast('You scored 100%! No missed questions to study.', '🎉');
    return;
  }

  // Filter local cards to missed only
  state.cards = state.quiz.results.detailedResults
    .filter(r => !r.isCorrect)
    .map(r => ({
      id: r.cardId,
      category: r.category,
      difficulty: r.difficulty,
      question: r.question,
      answer: r.correctAnswer,
      explanation: r.explanation,
      options: r.options,
      correct_index: r.correctIndex,
      is_mastered: false,
      times_reviewed: 1,
      is_starred: false
    }));

  state.currentCardIndex = 0;
  switchTab('learn');
  renderCurrentCard();
  showToast(`Loaded ${missedIds.size} missed questions into Learning Mode!`, '📖');
}

// ================= 3. STATS & PROGRESS =================
function initStatsEvents() {
  elements.btnResetData.addEventListener('click', async () => {
    const confirmReset = confirm('Are you sure you want to reset all progress, card mastery tags, and quiz history? This cannot be undone.');
    if (!confirmReset) return;

    try {
      await apiFetch('/api/cards/reset', { method: 'POST' });
      showToast('All progress reset to default.', '🔄');
      loadStatsAndHistory();
      loadCards();
    } catch (err) {
      console.error('Failed to reset', err);
    }
  });
}

async function loadStatsAndHistory() {
  try {
    const [stats, historyData] = await Promise.all([
      apiFetch('/api/stats'),
      apiFetch('/api/quiz/history')
    ]);

    state.stats = stats;
    state.history = historyData.history || [];

    renderStatsDashboard();
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

function renderStatsDashboard() {
  if (!state.stats) return;

  const { cards, tests, categories } = state.stats;
  const total = cards.totalCards || 50;
  const mastered = cards.masteredCards || 0;
  const pct = Math.round((mastered / total) * 100);

  elements.dashMasteredCount.textContent = mastered;
  elements.dashMasteredPct.textContent = `${pct}% mastered`;
  elements.dashLearningCount.textContent = cards.learningCards || 0;
  elements.dashHighScore.textContent = `${tests.highScore || 0}%`;
  elements.dashTestsCount.textContent = `${tests.testsCompleted || 0} tests completed (avg ${tests.averageScore || 0}%)`;
  elements.dashStarredCount.textContent = cards.starredCards || 0;

  // Category matrix
  elements.dashCategoryGrid.innerHTML = '';
  categories.forEach(c => {
    const catTotal = c.total || 0;
    const catMastered = c.mastered || 0;
    const catPct = catTotal > 0 ? Math.round((catMastered / catTotal) * 100) : 0;

    const miniCard = document.createElement('div');
    miniCard.className = 'category-card-mini';
    miniCard.innerHTML = `
      <div class="cat-mini-header">
        <span class="cat-mini-title">${c.category}</span>
        <span class="cat-mini-count">${catMastered}/${catTotal}</span>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width: ${catPct}%; background: var(--brand-primary);"></div>
      </div>
    `;
    elements.dashCategoryGrid.appendChild(miniCard);
  });

  // History table
  elements.historyTableBody.innerHTML = '';
  if (state.history.length === 0) {
    elements.historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No tests completed yet. Take a practice test to see your history!</td></tr>';
    return;
  }

  state.history.forEach(test => {
    const date = new Date(test.taken_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mins = Math.floor(test.time_taken_seconds / 60);
    const secs = test.time_taken_seconds % 60;
    const timeStr = `${mins}m ${secs.toString().padStart(2, '0')}s`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${test.id}</td>
      <td>${date}</td>
      <td>${test.score} / ${test.total_questions}</td>
      <td><strong>${test.percentage}%</strong></td>
      <td>${timeStr}</td>
      <td>
        <span class="status-pill ${test.percentage >= 80 ? 'pill-mastered' : 'pill-learning'}">
          ${test.percentage >= 80 ? 'Pass' : 'Needs Review'}
        </span>
      </td>
    `;
    elements.historyTableBody.appendChild(row);
  });
}

// ================= KEYBOARD SHORTCUTS =================
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes when typing into an input/select
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (state.currentTab === 'learn') {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        flipCard();
      } else if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        nextCard();
      } else if (e.code === 'ArrowLeft' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        prevCard();
      } else if (e.key === '1') {
        e.preventDefault();
        markCardProgress(false);
      } else if (e.key === '2') {
        e.preventDefault();
        markCardProgress(true);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleStar();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        shuffleDeck();
      }
    }
  });
}

// ================= CANVAS CONFETTI EFFECT =================
function launchConfetti() {
  const canvas = elements.confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: Math.random() * 6 + 4,
      d: Math.random() * 90,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
      tiltAngle: 0,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.7) * 16 - 2
    });
  }

  let animationFrame;
  let frameCount = 0;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;

    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2 + p.vy;
      p.x += Math.sin(p.d) * 2 + p.vx;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      p.vy += 0.35; // gravity

      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + (p.r / 4), p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 4));
      ctx.stroke();
    });

    if (frameCount < 160) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}
