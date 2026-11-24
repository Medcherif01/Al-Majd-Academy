# Al-Majd International Academy (KSA International & National Exams Platform)

Plateforme éducative complète destinée aux élèves et parents des écoles internationales d'Arabie Saoudite :
- **Systèmes couverts** : American Diploma (Digital SAT, AP, ACT), IB Diploma (DP HL/SL), Cambridge IGCSE & Edexcel A-Level, NAFES (هيئة تقويم التعليم والتدريب ETEC), Qudurat (القدرات العامة) & Tahsili (التحصيلي), Baccalauréat Français (AEFE).
- **Cours détaillés & Règles officielles** : Explications structurées, fiches de synthèse téléchargeables et quiz interactifs.
- **Générateur d'examens par IA Gemini** : Génération d'épreuves sur mesure conformes aux critères officiels (`@google/genai` avec `gemini-4-hydrogen`).
- **Coffre Past Papers & Corrections Officielles** : Aperçu gratuit de la Question 1 et déblocage payant (à l'unité ou via Pass Annuel) avec téléchargement complet sujet + corrigé.
- **Formateurs en ligne** :
  - **Marwan Mhamdi** — Tous les cursus en anglais (SAT, AP, IB, IGCSE/A-Level, GAT English).
  - **Mohamed Cherif** — Cursus en français et en arabe (Baccalauréat Français, Brevet, IB French B, Nafes, Qudurat, Tahsili).

## Déploiement sur GitHub + Vercel + MongoDB Atlas

1. **Créer un dépôt GitHub** et pousser le code :
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Al-Majd International Academy"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/<votre-repo>.git
   git push -u origin main
   ```

2. **Configurer MongoDB Atlas** :
   - Créez un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/atlas).
   - Récupérez votre URI de connexion (`mongodb+srv://<user>:<password>@cluster.mongodb.net/almajd_academy?retryWrites=true&w=majority`).
   - Autorisez les IP Vercel (`0.0.0.0/0` dans Network Access pour les fonctions serverless).

3. **Déployer sur Vercel** :
   - Importez votre dépôt GitHub sur [Vercel](https://vercel.com).
   - Dans **Settings → Environment Variables**, ajoutez :
     - `GEMINI_API_KEY` : votre clé API Google Gemini
     - `MONGODB_URI` : votre chaîne de connexion MongoDB Atlas
     - `SESSION_SECRET` : une chaîne aléatoire sécurisée (minimum 32 caractères)
   - Vercel détecte automatiquement `vercel.json`, compile le frontend Vite (`dist/`) et expose les routes `/api/*` via `/api/index.ts`.
