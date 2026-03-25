# GymPro Elite — הנחיות לסוכן

## חובה בכל שינוי קוד לפני push

**בכל commit שמשנה קבצי אפליקציה** (workout-core.js, style.css, index.html, archive-logic.js, editor-logic.js, storage.js, data.js) —
חובה לעדכן **גם**:

1. **`sw.js`** — העלה את `CACHE_VERSION` ב-1 (למשל `gympro-v14.12.0-24` → `gympro-v14.12.0-25`)
   ועדכן גם את שורת הקומנט `* Version: X`
2. **`version.json`** — עדכן את `"version"` לאותו מספר (ללא `gympro-v` prefix)

### למה זה קריטי
האפליקציה היא PWA. ה-Service Worker מזהה עדכון **רק** כשקובץ `sw.js` משתנה.
אם לא מעלים גרסה — המשתמש ממשיך לשרת מהcache הישן למרות שה-commit נדחף.

### תבנית
```
sw.js:      const CACHE_VERSION = 'gympro-v14.12.0-XX';
version.json: { "version": "14.12.0-XX" }
```

שניהם חייבים להיות באותו commit עם שאר השינויים.

---

## מבנה הפרויקט

| קובץ | תפקיד |
|------|--------|
| `index.html` | מבנה HTML + כל ה-UI |
| `workout-core.js` | לוגיקת אימון, מצב גלובלי, AI coach |
| `style.css` | עיצוב (RTL, Hebrew PWA) |
| `archive-logic.js` | ארכיון אימונים |
| `editor-logic.js` | עורך תוכנית + checkForUpdate |
| `storage.js` | StorageManager (localStorage) |
| `data.js` | נתוני ברירת מחדל |
| `sw.js` | Service Worker |
| `version.json` | גרסה נוכחית (נקרא ע"י SW וע"י האפליקציה) |

## הגרסה הנוכחית
14.12.0-24
