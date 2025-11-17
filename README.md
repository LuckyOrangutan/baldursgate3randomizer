## Baldur's Gate 3 Honor Run Forge

A tiny, serverless Next.js app that assembles randomized Honor mode runs for Baldur's Gate 3. Each build roll hands every player three multi-class hero options in which they must play in honor mode. When they complete a task, they can click on the completed task and a gear roll will occur for which you can select one of three items to unlock. We are using Tutorial Chest and GearUp mods to summon in the items unlocked by the player.

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
