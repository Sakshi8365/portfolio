# Portfolio

A fast, responsive, and accessible personal portfolio. Built with plain HTML, CSS, and JavaScript—easy to customize and deploy anywhere.

## Customize

- index.html
  - Replace "Your Name" and bio text in the hero.
  - Update social links and email in the Contact section.
  - Set correct URLs for `og:url` and `og:image` in the `<head>`.
  - Swap the Resume link to your actual PDF or page.
- data/projects.json
  - Add/update your projects. Fields: `title`, `description`, `tech` (array), optional `live`, optional `source`.
- assets/favicon.svg
  - Swap the letter or replace with your own favicon.
- css/styles.css
  - Adjust colors, spacing, and typography via CSS variables.

## Dark mode

Theme is stored in `localStorage` and respects user preference when set to `auto`. The toggle switches between light and dark.

## Preview locally (Windows / PowerShell)

This is a static site. You can open `index.html` directly in a browser, but for fetch requests (projects.json) to work consistently, use a local server.

Option A: Python (if installed)

```pwsh
python -m http.server 5173
```

Then visit http://localhost:5173

Option B: Node (if installed)

```pwsh
npx serve -p 5173
```

Option C: VS Code Live Server extension

- Install "Live Server" extension
- Right-click `index.html` → Open with Live Server

## Deploy

- GitHub Pages: push this folder and enable Pages (root or `/docs`).
- Netlify / Vercel: import the repo and deploy as a static site.

## License

MIT
