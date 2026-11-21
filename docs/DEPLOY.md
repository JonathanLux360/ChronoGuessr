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

The build uses relative asset paths, so it works from a sub-folder such as `https://name.github.io/chronoguessr/`.

1. Push the project to a GitHub repository.
2. Build locally with `npm run build`.
3. Publish the contents of `dist/` to a `gh-pages` branch, or add a GitHub Actions workflow that builds and uploads `dist/` as a Pages artefact.
4. In the repository settings, turn on Pages and choose that branch or the Actions source.

## Things to know

- **The leaderboard is per browser.** Scores live in the player's own localStorage, so they do not follow the player to another device or browser, and clearing site data erases them.
- **The font loads from Google Fonts.** If it is blocked, the site falls back to Georgia and still works.
- **Content changes need a rebuild.** Years and clues are built into the site. After editing `src/data/years.json`, run `npm run build` and deploy again.
