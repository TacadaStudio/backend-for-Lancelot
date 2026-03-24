---
name: developing-with-nextjs
description: Provides best practices and patterns for developing with Next.js (App Router), including server components, data fetching, and routing. Use this skill when the user asks for Next.js help or to create a new Next.js app.
---

# Developing with Next.js

This skill guides you through developing applications with Next.js, focusing on the App Router and modern React features.

## When to Use This Skill
- Creating a new Next.js application
- Understanding App Router file conventions
- Deciding between Server and Client Components
- Implementing data fetching
- optimizing images and fonts

## Workflow

### 1. Creating a New App
To create a new Next.js app with best practices (TypeScript, Tailwind, ESLint):

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint
cd my-app
```

### 2. File Conventions (App Router)
- `app/page.tsx`: The UI for a route.
- `app/layout.tsx`: Shared UI for a segment and its children. Root layout is required.
- `app/loading.tsx`: Loading UI for a segment.
- `app/error.tsx`: Error UI for a segment.
- `app/not-found.tsx`: Not found UI.
- `app/route.ts`: API endpoint.

### 3. Server vs Client Components

**Server Components (Default)**
- Use for: Fetching data, accessing backend resources, keeping sensitive info on server, reducing client bundle size.
- Cannot use: Hooks (`useState`, `useEffect`), event listeners (`onClick`), browser-only APIs.

**Client Components**
- Add `'use client'` at the top of the file.
- Use for: Interactivity, event listeners, hooks, browser APIs.
- Keep them at the leaves of your component tree to maximize performance.

### 4. Data Fetching

**Server Side (Recommended)**
```tsx
async function getData() {
  const res = await fetch('https://api.example.com/data')
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <main>{/* ... */}</main>
}
```

**Client Side**
Use SWR or React Query for client-side fetching.
```tsx
'use client'
import useSWR from 'swr'

const fetcher = (url) => fetch(url).then((res) => res.json())

export default function Profile() {
  const { data, error } = useSWR('/api/user', fetcher)
  if (error) return <div>Failed to load</div>
  if (!data) return <div>Loading...</div>
  return <div>Hello {data.name}!</div>
}
```

## Best Practices
- **Use Server Components by default.**
- **Colocate files.** Keep components, styles, and tests inside the `app` directory structure where specific to a route.
- **Optimize Images.** ALWAYS use `next/image`.
- **Optimize Fonts.** ALWAYS use `next/font`.
- **Metadata.** Export a `metadata` object from `layout.tsx` or `page.tsx` for SEO.

## Common CLI Commands
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run start`: Start production server.
- `npm run lint`: Run ESLint.
