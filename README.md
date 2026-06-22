# Zenith

Project Zenith is a Next.js app for selecting a location and viewing a live sky dome with satellites, planets, and analytics.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and add keys:
   ```bash
   cp .env.local.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`

## Deploy to Vercel

1. Create a GitHub repository and push this project.
2. Sign in to https://vercel.com and import the repository.
3. Set the environment variables in Vercel:
   - `NEXT_PUBLIC_CESIUM_ION_TOKEN`
   - `OPENWEATHER_API_KEY`
   - `N2YO_API_KEY`
4. Deploy the project.

### Vercel build settings

- Framework: `Next.js`
- Root directory: `.`
- Build command: `npm run build`
- Output directory: `.next`

## Notes

- The project is already created in this workspace, but I cannot host it directly from this environment.
- If you want, I can also generate a GitHub Actions workflow for deployment.
