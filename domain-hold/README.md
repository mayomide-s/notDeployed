# `domain-hold`

A premium, intentionally generic domain holding page built with `React`, `Vite`, and `TypeScript`.

This app reads the current hostname dynamically at runtime and displays it in the hero, which lets one deployment work across multiple attached domains without domain-specific copy overrides.

## Local setup

Run the project locally from inside the `domain-hold` directory:

```bash
npm install
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Common commands

```bash
npm install
npm run dev
npm run build
```

- `npm install` installs dependencies
- `npm run dev` starts the local development server
- `npm run build` creates a production build in `dist/`

## Deploying to Vercel

Vercel supports Vite projects directly.

### Option 1: Import from GitHub

1. Push the `domain-hold` project to a GitHub repository.
2. In Vercel, click **Add New Project**.
3. Import the repository.
4. Keep the framework preset as **Vite**.
5. If the repository contains other top-level files or folders, set the project root to `domain-hold`.
6. Deploy.

### Option 2: Use the Vercel CLI

```bash
npm install -g vercel
vercel
```

Then follow the prompts from inside the `domain-hold` folder.

For a production deployment:

```bash
vercel --prod
```

## Attaching multiple domains to the same Vercel project

You can point multiple parked domains at the same Vercel project.

1. Open the Vercel project.
2. Go to **Settings** -> **Domains**.
3. Add each root domain or subdomain you want to attach.
4. Update DNS at your registrar using the records or nameserver instructions Vercel provides.
5. Once connected, all attached domains will serve the same app, while the displayed hostname changes automatically based on the current request.

## Important reminder about domain ownership

Vercel handles hosting and domain attachment, but domain ownership and renewal are handled by your registrar, not Vercel.

That means:

- buying the domain is done at the registrar
- renewing the domain is done at the registrar
- DNS and nameserver changes are usually managed at the registrar

If a domain expires, Vercel does not renew it for you.

## Why the app is intentionally generic

This v1 is designed to be a polished default holding page:

- no backend
- no CMS
- no persistence
- no domain-specific content mapping

Instead, it stays generic and reads the hostname dynamically so the same deployment can serve multiple domains cleanly.
