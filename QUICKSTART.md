# DeutschTagebuch - Quick Start Guide

## 🎉 Your App is Ready!

The server is currently running at **http://localhost:3000**

## ✅ What's Been Built

### Backend (Node.js + Express + SQLite)
- ✅ Full REST API with all endpoints
- ✅ SQLite database with persistent storage
- ✅ Automatic vocabulary extraction
- ✅ MyMemory Translation API integration
- ✅ Streak tracking system
- ✅ Progress statistics
- ✅ Data export/import functionality

### Frontend (HTML + JavaScript)
- ✅ Beautiful responsive UI
- ✅ Dashboard with real-time stats
- ✅ Daily journal with translation
- ✅ Vocabulary bank with search/filter
- ✅ Common phrases section
- ✅ Motivation tips
- ✅ Offline detection

## 🚀 How to Use

### 1. Access the App
Open your browser and go to: **http://localhost:3000**

### 2. Daily Workflow

#### Write Your Journal Entry:
1. Click on "Daily Journal" in the sidebar
2. Write 10-15 sentences in English (left panel)
3. Click the **"🌐 Translate"** button to get German translation
4. Edit the German version if needed
5. Click **"✨ Process & Save"** to save and extract vocabulary

#### Review Your Progress:
- **Dashboard**: See your streak, vocabulary count, and learning charts
- **Vocabulary Bank**: Browse all learned words with search and filters
- **Common Phrases**: Practice useful German expressions

### 3. Key Features

**Automatic Translation:**
- Write in English, get instant German translation
- Uses MyMemory API (free, 1000 requests/day)

**Smart Vocabulary Extraction:**
- Automatically extracts German words from your writing
- Filters out common stop words
- Tracks word frequency
- No duplicates

**Progress Tracking:**
- Daily streak counter
- Words learned per week
- Visual charts showing your progress
- Session timer

**Data Persistence:**
- Everything is saved to SQLite database
- Export your data anytime via `/api/data/export`
- Import backups via `/api/data/import`

## 📁 Project Structure

```
Fluent_man/
├── index.html              # Frontend UI
├── app.js                  # Frontend JavaScript
├── server.js               # Express server
├── package.json            # Dependencies
├── deutschtagebuch.db      # SQLite database (auto-created)
├── backend/
│   ├── database.js         # Database setup
│   ├── routes/             # API endpoints
│   │   ├── journal.js      # Journal CRUD
│   │   ├── vocabulary.js   # Vocabulary management
│   │   ├── phrases.js      # Phrases
│   │   ├── progress.js     # Statistics & streaks
│   │   ├── translate.js    # Translation
│   │   ├── settings.js     # User settings
│   │   └── data.js         # Export/import
│   └── services/
│       ├── translation.js  # Translation logic
│       └── vocabulary-extractor.js
└── README.md               # Full documentation
```

## 🔧 Server Commands

**Start the server:**
```bash
npm start
```

**Development mode (auto-restart):**
```bash
npm run dev
```

**Stop the server:**
Press `Ctrl+C` in the terminal

## 📊 API Endpoints

All endpoints are available at `http://localhost:3000/api`

### Journal
- `POST /api/journal/entry` - Create entry
- `GET /api/journal/entries` - Get all entries
- `GET /api/journal/search?q=term` - Search entries

### Vocabulary
- `GET /api/vocabulary` - Get all words
- `GET /api/vocabulary/stats` - Get statistics
- `DELETE /api/vocabulary/:id` - Delete word

### Translation
- `POST /api/translate` - Translate English to German

### Progress
- `GET /api/progress/stats` - Overall statistics
- `GET /api/progress/streak` - Current streak
- `GET /api/progress/chart-data?days=7` - Chart data

### Data Management
- `GET /api/data/export` - Export all data
- `POST /api/data/import` - Import backup

## 💡 Tips for Daily Practice

1. **Write Every Day**: Even 5 sentences help maintain your streak
2. **Review Vocabulary**: Check your Vocabulary Bank regularly
3. **Use Phrases**: Practice the common phrases section
4. **Track Progress**: Watch your charts grow over time
5. **Export Regularly**: Backup your data weekly

## 🎯 Your Learning Goals

- **Daily Goal**: 60 minutes of practice
- **Sentence Goal**: 10-15 sentences per day
- **Focus**: Conversational fluency, not exam preparation

## 🐛 Troubleshooting

**Server won't start:**
- Make sure port 3000 is not in use
- Run `npm install` again if needed

**Translation not working:**
- Check your internet connection
- MyMemory API has 1000 requests/day limit

**Data not saving:**
- Check if `deutschtagebuch.db` file exists
- Look for errors in the terminal

## 📝 Next Steps

1. Open http://localhost:3000 in your browser
2. Start writing your first journal entry
3. Watch your vocabulary grow!
4. Track your daily streak

---

**Viel Erfolg mit deinem Deutsch! 🇩🇪**

For detailed documentation, see [README.md](README.md)