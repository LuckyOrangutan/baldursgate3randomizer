## Baldur's Gate 3 Honor Run Forge

A tiny, serverless Next.js app that assembles randomized Honor mode runs for Baldur's Gate 3. Each reroll hands every player three multi-class hero options plus up to four chaotic affixes—reveal your trio, pick your favorite, and commit for the act.

### Editing the tables

All of the randomization tables live in `src/data/runOptions.ts`. The structure is plain arrays and can be tweaked without touching React:

- `races`, `genders`, `classes` (with subclasses) define character origins and multiclass pools. Race is no longer auto-selected for players, but the list still feeds affix placeholders such as `{{race}}`.
- `buildDirectives` contains the affix templates—each hero rolls up to four per reroll.
- `collectibleItems` and `companions` provide pools for directive placeholders such as `{{item}}`, `{{race}}`, `{{raceOrGender}}`, and `{{companion}}`. Edit those arrays to control what gets injected into each affix.

Feel free to add/remove entries or introduce new directives—`page.tsx` automatically adapts to any length.

### Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to interact with the generator. The UI is fully static, so deploying to Vercel is instant (`npm run build`).

### Tech stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4 with custom gradients to echo BG3’s parchment + ember palette
- `next/font` for Cinzel display headings and Inter body copy

### Deploying to Vercel

The app is serverless—push to the `main` branch (or import the repo) inside Vercel and use the default Next.js build command:

```bash
npm run build
```

That’s it—enjoy the chaos!
