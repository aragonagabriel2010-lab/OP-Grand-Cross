# One Piece: Grand Voyage

Fan-made gacha/RPG ispirato a *Seven Deadly Sins: Grand Cross*, ambientato nell'East Blue di One Piece.

Il gioco usa **Firebase Auth** + **Cloud Firestore** per il progresso online.
I cataloghi (personaggi/capitoli) restano nel client; audio preferences restano in `localStorage`.

## Requisiti

- Node.js 18+
- npm

## Setup

```bash
npm install
npm run dev
```

Apri l'URL stampato da Vite (di solito `http://localhost:5173`).

## Build produzione

```bash
npm run build
npm run preview
```

La cartella `dist/` può essere servita da qualsiasi server statico (Nginx, GitHub Pages, Netlify, ecc.).

### GitHub Pages

Il sito è su `https://<user>.github.io/OP-Grand-Cross/`. Serve la **build** (`dist`), non il codice sorgente.

1. Push su `main` (workflow `.github/workflows/deploy-pages.yml`)
2. Repo → **Settings → Pages → Source: GitHub Actions**
3. Opzionale: secrets `VITE_FIREBASE_*` per Auth/Firestore in produzione

In locale `npm run build` usa già `base: /OP-Grand-Cross/`.

## Struttura dati

| Percorso | Ruolo |
|----------|--------|
| `src/data/characters.js` | Catalogo personaggi (hero + enemy) |
| `src/data/chapters.js` | Capitoli storia East Blue |
| `src/lib/localDb.js` | API gioco + sync Firestore |
| `src/lib/firestoreSave.js` | Read/write `players/{uid}` |
| `src/hooks/useGame.js` | Hook stato di gioco |

Progresso cloud: documento Firestore `players/{uid}` (PlayerState, OwnedCharacter, stats).
Cache locale: `opgv_save_{uid}`. Preferenze audio restano solo sul device.

## Firebase Auth + Firestore

Il file **Admin SDK** (`*firebase-adminsdk*.json`) **non** va usato nel frontend.

1. `.env.local` con `VITE_FIREBASE_*` (già configurato se hai fatto il setup web)
2. Authentication: Email/Password e Google abilitati
3. Firestore: rules deployate (`players/{uid}` solo per il proprietario)

Al primo login, un eventuale save locale viene migrato sul cloud.

## Impostazioni

Dalla Home, icona ingranaggio: Account / Statistiche / Audio (localStorage `opgv_audio_v1`) / Logout.

## Script

- `npm run dev` — sviluppo
- `npm run build` — build produzione
- `npm run preview` — anteprima build
- `npm run lint` — ESLint
