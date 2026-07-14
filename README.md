# 🎨 Dev Days: Social Image Creator

**Create event and social media banners with live preview and one-click export.**

Built for **GitHub Copilot Dev Days**.

This repository contains a browser-based app built to generate banners quickly with a guided workflow.
It is ideal for event teams, communities, and social media operations that need fast, consistent visuals.

---

## 🚀 Try It Locally

Want to test the app quickly on your machine? Follow the steps below.

1. 📦 Install dependencies:

	```bash
	npm install
	```

2. ▶️ Start the development server:

	```bash
	npm run dev
	```

3. 🌐 Open in your browser:

	```text
	http://localhost:5173/ghcpdevdays-design/
	```

## 🎯 About the Project

- **Live canvas rendering:** See banner updates in real time while editing (debounced for smooth typing).
- **Ready-to-use formats:** Event Cover, Speaker Profile, Speaker Banner, Social Promo, and Luma Cover.
- **Branding support:** Upload speaker photos, organization logo, and partner logos.
- **Registration bar:** Add CTA + registration URL in Social Promo and Speaker Banner.
- **Export pipeline:** Download in PNG/JPG with 1x or 2x scale.
- **Local history:** Restore, delete, and manage recent generated banners (stored in `localStorage`).

## 🛠️ Tech Stack

- ⚛️ **React 19** + **TypeScript**
- ⚡ **Vite 7** for dev server and bundling
- 🎨 **HTML Canvas** for banner rendering
- 🔤 **Mona Sans** & **Mona Sans Mono** variable fonts (self-hosted)
- 🧩 **@primer/octicons-react** for icons
- 🧹 **ESLint** (type-checked config)

## 📁 Project Structure

```text
src/
├─ App.tsx            # UI shell, state, and effects
├─ types.ts           # Shared type definitions
├─ constants.ts       # Formats, colors, and static config
├─ lib/
│  ├─ renderBanner.ts # Canvas rendering engine
│  ├─ canvasText.ts   # Text wrapping / rounded-rect helpers
│  ├─ image.ts        # Image cache, loading, and file helpers
│  ├─ history.ts      # Default state + localStorage history
│  └─ format.ts       # id / initials utilities
└─ assets/            # Backgrounds and web fonts
public/
├─ favicon/           # Favicon set (ico, png, apple-touch, android-chrome)
└─ site.webmanifest   # PWA manifest
```

## 🖥️ How to Run Locally

Prerequisites:
- Node.js 20+
- npm 10+

Commands:

```bash
npm install      # install dependencies
npm run dev      # start the dev server
npm run lint     # run ESLint
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## 🤝 How to Contribute

1. 🍴 Fork the repository
2. 🌱 Create a branch: `git checkout -b my-feature`
3. ✏️ Commit: `git commit -m 'feat: my new feature'`
4. 🚀 Push: `git push origin my-feature`
5. 🔄 Open a Pull Request

## 📬 Contact

Open an issue for questions, suggestions, or bug reports.

**✨ Build faster banners. Keep your brand consistent. 🚀**
