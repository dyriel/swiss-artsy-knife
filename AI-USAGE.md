# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

Assistant: Claude (Anthropic), in Claude Code and the Claude app.

## 1. How I used AI

How much: Claude wrote code for the main tools (Palette Studio, Background Eraser, QR Generator), the Express server and the login system. What didn't need AI was the components as well as most of the setting up of the database.

04/10/2026 - Moving my existing code into the course template
Tool: Claude
What I asked for: Merge my existing Home page and Zine Layout into the class template, and finish the zine against the requirements.
What it gave back: A repo layout, a rewritten ZineLayout.jsx and lib/zineLayout.js, 
What I kept, what I changed, and why: I changed the layout of the old repo to match the template's. This is because I originally made a sample webapp so I had to 'transfer' what I already built to the template repo.
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

YYYY-MM-DD - Checking my folder structure against the documentation
Tool: Claude
What I asked for: Whether the project structure followed my documentation, and to adjust it if not.
What it gave back: A comparison and a reorganised structure with components/, pages/ and lib/.
What I kept, what I changed, and why: [your words]
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

YYYY-MM-DD - Palette Studio and saved palettes
Tool: Claude
What I asked for: The Palette Studio screen from my wireframe: five colours with locks, theme randomising, extraction from an image, and saving with a name and tags.
What it gave back: lib/palette.js (colour maths, themes, k-means extraction), pages/PaletteStudio.jsx, pages/SavedPalettes.jsx and the saved-palette store.
What I kept, what I changed, and why: [your words]
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

YYYY-MM-DD - Background Eraser, and API versus library
Tool: Claude
What I asked for: The Background Eraser screen from my wireframe, and whether an API would be easier for removing backgrounds.
What it gave back: The advice that an in-browser library is easier than an API (no key, no quota, no image upload), plus lib/bgRemove.js with a Quick mode (edge flood-fill) and a Smart mode (@imgly/background-removal).
What I kept, what I changed, and why: [your decision about the library and its AGPL licence, see section 2]
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

YYYY-MM-DD - QR Generator
Tool: Claude
What I asked for: The QR screen from my wireframe: styles, colours, logo, export.
What it gave back: lib/qr.js (custom canvas drawing on top of qrcode-generator) and pages/QRGenerator.jsx. It also checked that codes in every style still scan.
What I kept, what I changed, and why: [your words]
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

YYYY-MM-DD - Debugging the app on my machine
Tool: Claude
What I asked for: Fixes for the errors I pasted from npm run dev and the browser console.
What it gave back: Explanations and corrected files (see section 2).
What I kept, what I changed, and why: [your words]
Commit: https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

## 2. Where the AI got it wrong

### Case 1 - - Wrong body font

- **What it gave me:** After I shared the design-system image, it changed the body font to Public Sans, because the image listed it.
- **What was wrong with it:** My project uses Plus Jakarta Sans for body text. The sheet shows two families, and the AI picked the wrong one without asking.
- **What I did instead:** What I did instead: I told it to use Plus Jakarta Sans, and it reverted index.css and the design doc. [Add how you noticed.]
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

### Case 1 - Blank white page from a missing router

- **What it gave me:** A new App.jsx using <Routes> and <Link>.
- **What was wrong with it:** My template's main.jsx had no BrowserRouter and still imported ./styles.css, so the app showed a white screen. The AI changed one file without checking the entry file it depended on.
- **What I did instead:** I pasted my main.jsx and the console error. The AI replaced it, with the router and the basename the GitHub Pages deploy needs. [Add what you checked.]
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

### Case 2 - Blank white page from a missing router

- **What it gave me:** A new App.jsx using <Routes> and <Link>.
- **What was wrong with it:** My template's main.jsx had no BrowserRouter and still imported ./styles.css, so the app showed a white screen. The AI changed one file without checking the entry file it depended on.
- **What I did instead:** I pasted my main.jsx and the console error. The AI replaced it, with the router and the basename the GitHub Pages deploy needs. [Add what you checked.]
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

### Case 3 - Code that imported things I did not have

- **What it gave me:** An App.jsx that imported ./pages/Home.jsx and react-router-dom.
- **What was wrong with it:** The pages/ folder was missing on my machine and react-router-dom was not installed, so Vite failed with "Failed to resolve import". The AI did not tell me what to create or install.
- **What I did instead:** I pasted both Vite errors and the AI explained them. I installed react-router-dom and added it to vite.config.js
- **Commit:** https://github.com/YOUR-USERNAME/YOUR-REPO/commit/SHA

## 3. Who wrote what

### Written by me

- **File:**
- **Commit:**
- **What it does and why it is built this way:**

### The AI-written part I understand best

- **File:**
- **Commit:**
- **What it does and why we kept it:**
