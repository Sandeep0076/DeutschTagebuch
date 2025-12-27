// DeutschTagebuch - Frontend Application Logic with Backend Integration
// API Base URL
const API_BASE = window.location.origin + '/api';

// Application State
const state = {
    currentView: 'dashboard',
    timer: 0,
    timerInterval: null,
    sessionStart: Date.now(),
    isOnline: true,
    editingEntryId: null
};

// --- API HELPER FUNCTIONS ---
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);

        // Check if offline
        if (!navigator.onLine) {
            state.isOnline = false;
            showOfflineWarning();
        }

        throw error;
    }
}

function showOfflineWarning() {
    const warning = document.createElement('div');
    warning.id = 'offline-warning';
    warning.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    warning.innerHTML = '⚠️ No connection to server. Please start the backend.';
    document.body.appendChild(warning);
}

function hideOfflineWarning() {
    const warning = document.getElementById('offline-warning');
    if (warning) warning.remove();
    state.isOnline = true;
}

// --- NAVIGATION ---
function navTo(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btns = document.querySelectorAll('.nav-item');
    btns.forEach(btn => {
        if (btn.getAttribute('onclick').includes(viewId)) {
            btn.classList.add('active');
        }
    });

    document.getElementById('mobile-menu').classList.add('hidden');
    state.currentView = viewId;

    // Load data for specific views
    if (viewId === 'vocabulary') loadVocabulary();
    if (viewId === 'dashboard') loadDashboard();
    if (viewId === 'phrases') loadPhrases();
    if (viewId === 'journal') loadJournalHistory();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

// --- TIMER LOGIC ---
function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timer++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('desktop-timer').innerText = formatted;
    document.getElementById('mobile-timer').innerText = formatted;

    const dashTime = document.getElementById('dash-time');
    if (dashTime) dashTime.innerText = minutes;

    const percentage = Math.min((state.timer / 3600) * 100, 100);
    document.getElementById('timer-bar').style.width = `${percentage}%`;
}

// --- DASHBOARD ---
let progressChartInstance = null;

async function loadDashboard() {
    try {
        // Load statistics
        const stats = await apiCall('/progress/stats');
        const streak = await apiCall('/progress/streak');
        const vocabStats = await apiCall('/vocabulary/stats');

        // Update UI
        document.getElementById('stat-vocab-count').innerText = stats.data.vocabulary.total;
        document.getElementById('stat-vocab-new').innerText = stats.data.vocabulary.thisWeek;
        document.getElementById('stat-entries').innerText = stats.data.entries.total;

        // Update streak
        const streakEl = document.querySelector('#dashboard .text-4xl.font-bold.text-amber-600');
        if (streakEl) {
            streakEl.innerHTML = `${streak.data.current} Day${streak.data.current !== 1 ? 's' : ''}`;
        }
        const bestStreakEl = streakEl?.nextElementSibling;
        if (bestStreakEl) {
            bestStreakEl.innerHTML = `Personal Best: ${streak.data.longest} Days`;
        }

        // Load chart data
        await loadChart();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadChart() {
    try {
        const chartData = await apiCall('/progress/chart-data?days=7');

        const ctx = document.getElementById('progressChart').getContext('2d');

        if (progressChartInstance) {
            progressChartInstance.destroy();
        }

        progressChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.data.labels,
                datasets: [{
                    label: 'Words Learned',
                    data: chartData.data.datasets.words,
                    borderColor: '#2563eb', // Blue-600
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        cornerRadius: 12,
                        titleFont: { family: 'Outfit', size: 14 },
                        bodyFont: { family: 'Outfit', size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [4, 4], color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { family: 'Outfit' }, color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Outfit' }, color: '#64748b' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

// --- JOURNAL ---
function clearJournal() {
    state.editingEntryId = null;
    document.getElementById('input-en').value = '';
    document.getElementById('input-de').value = '';

    // Reset save button text
    const saveBtn = document.querySelector('button[onclick="processEntry()"]');
    if (saveBtn) saveBtn.innerHTML = '<span>✨</span> Save Entry';
}

async function translateText() {
    const enText = document.getElementById('input-en').value;

    if (!enText.trim()) {
        alert('Please write something in English first!');
        return;
    }

    const translateBtn = event.target.closest('button');
    const originalText = translateBtn.innerHTML;
    translateBtn.innerHTML = '<span>⏳</span> Translating...';
    translateBtn.disabled = true;

    try {
        const result = await apiCall('/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: enText,
                multiSentence: true
            })
        });

        document.getElementById('input-de').value = result.data.translated;
    } catch (error) {
        alert('Translation failed: ' + error.message);
    } finally {
        translateBtn.innerHTML = originalText;
        translateBtn.disabled = false;
    }
}

async function processEntry() {
    const enText = document.getElementById('input-en').value;
    const deText = document.getElementById('input-de').value;

    if (!deText.trim()) {
        alert('Bitte schreiben Sie etwas auf Deutsch!');
        return;
    }

    if (!enText.trim()) {
        alert('Please write something in English!');
        return;
    }

    const saveBtn = event.target.closest('button');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>⏳</span> Saving...';
    saveBtn.disabled = true;

    try {
        const sessionDuration = Math.floor(state.timer / 60);
        let result;

        if (state.editingEntryId) {
            // Update existing entry
            result = await apiCall(`/journal/entry/${state.editingEntryId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    english_text: enText,
                    german_text: deText
                })
            });
        } else {
            // Create new entry
            result = await apiCall('/journal/entry', {
                method: 'POST',
                body: JSON.stringify({
                    english_text: enText,
                    german_text: deText,
                    session_duration: sessionDuration
                })
            });
        }

        // Show success feedback
        document.getElementById('new-words-count').innerText = result.data.new_words.length;
        document.getElementById('feedback-area').classList.remove('hidden');

        // Clear inputs
        clearJournal();

        // Reload dashboard if visible
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }

        // Reload journal history 
        await loadJournalHistory();
    } catch (error) {
        alert('Failed to save entry: ' + error.message);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// --- JOURNAL HISTORY ---
async function loadJournalHistory() {
    try {
        const sort = document.getElementById('journal-sort').value;
        const result = await apiCall(`/journal/entries?title=&sort=${sort}&limit=50`);
        renderJournalHistory(result.data);
    } catch (error) {
        console.error('Error loading journal history:', error);
        document.getElementById('journal-history-list').innerHTML =
            '<div class="text-center py-10 opacity-50 text-sm text-red-500">Failed to load history</div>';
    }
}

function renderJournalHistory(entries) {
    const container = document.getElementById('journal-history-list');
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 opacity-50">
                <div class="text-4xl mb-2">📝</div>
                <div class="text-sm">No entries yet</div>
            </div>`;
        return;
    }

    entries.forEach(entry => {
        const date = new Date(entry.created_at);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        // Preview text (German preferred, fallback to English)
        const previewText = (entry.german_text || entry.english_text).substring(0, 60) + '...';

        const div = document.createElement('div');
        div.className = 'p-4 rounded-xl bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all cursor-pointer group';
        div.onclick = () => viewJournalEntry(entry.id);

        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="text-xs font-bold text-blue-600 uppercase tracking-widest">${dayName}</div>
                    <div class="text-sm font-bold text-slate-700">${dateString}</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-mono">${entry.word_count} words</span>
                    <button onclick="deleteJournalEntry(event, ${entry.id})" class="text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete Entry">🗑️</button>
                </div>
            </div>
            <p class="text-xs text-slate-500 italic leading-relaxed line-clamp-2 group-hover:text-slate-700 transition-colors">
                "${previewText}"
            </p>
        `;
        container.appendChild(div);
    });
}

async function viewJournalEntry(id) {
    try {
        // Option to verify if user wants to overwrite current unsaved text? 
        // For now, we assume viewing history overwrites or we could ask.
        // Let's just load it.
        const result = await apiCall(`/journal/entry/${id}`);
        const entry = result.data;

        document.getElementById('input-en').value = entry.english_text;
        document.getElementById('input-de').value = entry.german_text;

        // Scroll to top of journal inputs on mobile if needed
        if (window.innerWidth < 1024) {
            document.getElementById('input-en').scrollIntoView({ behavior: 'smooth' });
        }

        // Set editing state
        state.editingEntryId = id;
        const saveBtn = document.querySelector('button[onclick="processEntry()"]');
        if (saveBtn) saveBtn.innerHTML = '<span>🔄</span> Update Entry';

    } catch (error) {
        console.error('Error loading entry:', error);
        alert('Failed to load entry');
    }
}

async function deleteJournalEntry(event, id) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this journal entry?')) return;

    try {
        await apiCall(`/journal/entry/${id}`, { method: 'DELETE' });

        // If we deleted the currently edited entry, clear the form
        if (state.editingEntryId === id) {
            clearJournal();
        }

        await loadJournalHistory();

        // Refresh dashboard stats if active
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry');
    }
}

// --- VOCABULARY ---
async function loadVocabulary() {
    try {
        const searchText = document.getElementById('vocab-search').value;
        const sortMode = document.getElementById('vocab-sort').value;

        const result = await apiCall(`/vocabulary?search=${encodeURIComponent(searchText)}&sort=${sortMode}`);
        renderVocabulary(result.data);
    } catch (error) {
        console.error('Error loading vocabulary:', error);
    }
}

function renderVocabulary(words) {
    const container = document.getElementById('vocab-grid');
    container.innerHTML = '';

    if (words.length === 0) {
        document.getElementById('empty-vocab-state').classList.remove('hidden');
    } else {
        document.getElementById('empty-vocab-state').classList.add('hidden');
        words.forEach(item => {
            const div = document.createElement('div');
            div.className = 'glass-card p-4 rounded-[20px] relative cursor-pointer group hover:bg-white/90 transition-all !bg-white/50 border border-white/60';

            const date = new Date(item.first_seen).toLocaleDateString();
            const frequency = item.frequency > 1 ? `<div class="text-xs text-blue-600 mt-2 font-mono font-bold">Used ${item.frequency}x</div>` : '';

            div.innerHTML = `
                <div onclick="toggleWordMeaning(${item.id}, event)" class="cursor-pointer">
                    <div class="font-bold text-xl text-slate-800 mb-1">${item.word}</div>
                    <div class="text-xs text-slate-500 opacity-80">Added: ${date}</div>
                    ${frequency}
                    <div id="meaning-${item.id}" class="hidden mt-3 pt-3 border-t border-slate-200">
                        <div class="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Meaning</div>
                        <div class="text-sm text-slate-700 italic" id="meaning-text-${item.id}">
                            ${item.meaning || '<span class="text-slate-400">Loading...</span>'}
                        </div>
                    </div>
                </div>
                <button onclick="deleteWord(${item.id})" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl">×</button>
            `;
            container.appendChild(div);
        });
    }
}

function filterVocab() {
    loadVocabulary();
}

function sortVocab() {
    loadVocabulary();
}

async function toggleWordMeaning(id, event) {
    event.stopPropagation();
    
    const meaningDiv = document.getElementById(`meaning-${id}`);
    const meaningText = document.getElementById(`meaning-text-${id}`);
    
    if (meaningDiv.classList.contains('hidden')) {
        meaningDiv.classList.remove('hidden');
        
        // If meaning is not loaded, fetch it
        if (meaningText.innerHTML.includes('Loading...') || meaningText.innerHTML.includes('text-slate-400')) {
            try {
                const result = await apiCall(`/vocabulary/${id}/meaning`);
                meaningText.innerHTML = result.data.meaning || '<span class="text-slate-400">No meaning available</span>';
            } catch (error) {
                console.error('Error fetching meaning:', error);
                meaningText.innerHTML = '<span class="text-red-400">Failed to load meaning</span>';
            }
        }
    } else {
        meaningDiv.classList.add('hidden');
    }
}

async function addWord() {
    const wordInput = document.getElementById('new-word-input');
    const meaningInput = document.getElementById('new-word-meaning');
    
    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();
    
    if (!word) {
        alert('Please enter a word!');
        return;
    }
    
    try {
        const payload = { word };
        if (meaning) {
            payload.meaning = meaning;
        }
        
        await apiCall('/vocabulary', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        // Clear inputs
        wordInput.value = '';
        meaningInput.value = '';
        
        // Reload vocabulary
        await loadVocabulary();
        
        // Show success feedback
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        successMsg.innerHTML = '✓ Word added successfully!';
        document.body.appendChild(successMsg);
        
        setTimeout(() => successMsg.remove(), 3000);
        
        // Update dashboard if visible
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        if (error.message.includes('already exists')) {
            alert('This word is already in your vocabulary!');
        } else {
            alert('Failed to add word: ' + error.message);
        }
    }
}

async function deleteWord(id) {
    if (!confirm('Delete this word from your vocabulary?')) return;

    try {
        await apiCall(`/vocabulary/${id}`, { method: 'DELETE' });
        await loadVocabulary();
        if (state.currentView === 'dashboard') {
            await loadDashboard();
        }
    } catch (error) {
        alert('Failed to delete word: ' + error.message);
    }
}

// --- PHRASES ---
async function loadPhrases() {
    try {
        const result = await apiCall('/phrases');
        renderPhrases(result.data);
    } catch (error) {
        console.error('Error loading phrases:', error);
    }
}

function renderPhrases(phrases) {
    const container = document.getElementById('phrases-container');
    container.innerHTML = '';

    phrases.forEach((phrase, index) => {
        const div = document.createElement('div');
        div.className = 'glass-card rounded-[24px] overflow-hidden cursor-pointer group hover:bg-white/90 transition-all border-none !bg-white';
        div.onclick = () => toggleTranslation(index);

        const customBadge = !phrase.builtin ? '<span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">Custom</span>' : '';

        div.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">English</span>
                    <div class="flex gap-2 items-center">
                        ${customBadge}
                        <span class="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">Click to reveal</span>
                    </div>
                </div>
                <p class="text-2xl text-slate-700 font-medium leading-relaxed">${phrase.english}</p>
            </div>
            <div id="phrase-de-${index}" class="bg-slate-50 p-8 border-t border-slate-100 hidden">
                <div class="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Deutsch</div>
                <p class="text-2xl font-bold text-slate-900 tracking-tight">${phrase.german}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleTranslation(index) {
    const el = document.getElementById(`phrase-de-${index}`);
    el.classList.toggle('hidden');
}

// --- INITIALIZATION ---
window.onload = async function () {
    // Check server connection
    try {
        await apiCall('/health');
        hideOfflineWarning();
    } catch (error) {
        showOfflineWarning();
    }

    // Start timer
    startTimer();

    // Load initial data
    await loadDashboard();
    await loadPhrases();

    // Setup mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);

    // Monitor online/offline status
    window.addEventListener('online', () => {
        hideOfflineWarning();
        loadDashboard();
    });

    window.addEventListener('offline', () => {
        showOfflineWarning();
    });
};