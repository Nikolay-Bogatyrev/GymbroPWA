# 🏋️ GymBro PWA

Мобильное приложение для отслеживания тренировок.

## 🚀 Быстрый старт

1. Скачай или клонируй репозиторий
2. Открой `index.html` в браузере
3. Готово!

## 📱 Установка на телефон

### Android (Chrome)
1. Открой сайт в Chrome
2. Нажми меню (⋮) → "Добавить на главный экран"

### iOS (Safari)
1. Открой сайт в Safari
2. Нажми "Поделиться" → "На экран Домой"

## 🛠 Технологии

- **Alpine.js** — реактивность
- **Tailwind CSS** — стили
- **Lucide** — иконки
- **localStorage** — хранение данных

## 📁 Структура

```
gymbroPWA/
├── index.html      ← Всё приложение
├── js/
│   ├── app.js      ← Alpine компонент
│   ├── data.js     ← Шаблоны тренировок
│   └── storage.js  ← LocalStorage
├── css/
│   └── custom.css
├── icons/
│   ├── exercises.js
│   ├── icon-192.png
│   └── icon-512.png
├── docs/
│   ├── FEATURES.md
│   └── STYLE_GUIDE.md
├── manifest.json
└── sw.js
```

## ✏️ Редактирование тренировок

Открой `js/data.js` и измени объект `WORKOUT_TEMPLATES`.

## 🖼 Кадры упражнений

`images/exercises/<id>/` — кадры из [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain). Список упражнений с кадрами — в `js/exercise-frames.js`.

## 📚 Документация

- [FEATURES.md](docs/FEATURES.md) — список фич и задачи
- [STYLE_GUIDE.md](docs/STYLE_GUIDE.md) — справочник для верстки

## 💾 Экспорт данных

В консоли браузера:
```javascript
JSON.stringify(Storage.exportData())
```

## 📄 Лицензия

MIT
