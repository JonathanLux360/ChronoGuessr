# Deploying ChronoGuessr

ChronoGuessr is a static site. `npm run build` writes everything to `dist/`, and any static host can serve that folder. There is no server and no environment variable to set.

## Before you deploy

Run these and check they all pass:

```powershell
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm run build` also runs the release content check. It fails if any clue breaks a content rule, or if fewer than 100 years are live (a year is live when every category has at least one verified clue). If you remove years or clues, the build tells you when the pool drops below the minimum.

To look at the built site on your own machine first:

```powershell
npm run preview
```

## Option 1: Netlify

1. Push the project to a Git host (GitHub, GitLab or Bitbucket).
2. In Netlify, choose **Add new site, Import an existing project** and pick the repository.
3. Build command: `npm run build`. Publish directory: `dist`.
4. Deploy. Later pushes to the main branch redeploy automatically.

Or, without Git: run `npm run build`, then drag the `dist` folder onto the Netlify "Deploy manually" page.

## Option 2: Vercel

1. Push the project to a Git host.
2. In Vercel, choose **Add New, Project** and import the repository.
3. Vercel detects Vite. Check that the build command is `npm run build` and the output directory is `dist`.
4. Deploy.

## Option 3: GitHub Pages

This repository already contains the workflow, `.github/workflows/deploy.yml`. It runs the lint, the unit tests and the build, then publishes `dist/` to GitHub Pages. Nothing is deployed if a check fails.

1. In the repository on GitHub, open **Settings, Pages**.
2. Under **Build and deployment, Source**, choose **GitHub Actions**.
3. Push to `main`, or open the **Actions** tab, choose **Deploy to GitHub Pages** and press **Run workflow**.
4. When the run turns green, the site is at `https://jonathanlux360.github.io/ChronoGuessr/`. The address also appears on the run's deploy step and under Settings, Pages.

Every later push to `main` redeploys the site automatically.

Things to check:

- **Public repositories only on the free plan.** GitHub Pages on a free personal account needs the repository to be public. A private repository needs a paid plan.
- **The build uses relative asset paths**, so it works from the `/ChronoGuessr/` sub-folder without any extra setting.
- **The Playwright test is not run in the workflow.** It needs a browser. Run `npm run test:e2e` on your own machine before pushing a big change.

## Things to know

- **The leaderboard is per browser.** Scores live in the player's own localStorage, so they do not follow the player to another device or browser, and clearing site data erases them.
- **The font loads from Google Fonts.** If it is blocked, the site falls back to Georgia and still works.
- **Content changes need a rebuild.** Years and clues are built into the site. After editing `src/data/years.json`, run `npm run build` and deploy again.
