/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────────────
      // BRAND DESIGN TOKENS — SINGLE SOURCE OF TRUTH
      //
      // These are the locked brand colors for 산냥이집냥이. This file is the
      // authoritative source; `docs/design/design.md` documents intent and
      // usage but defines NO values of its own — it points here. If a value
      // changes, change it here and nowhere else.
      //
      // Anchored on the colors already shipping at https://mohocat.vercel.app
      // (yellow-400 → orange-300 CTA gradient, yellow-400 map markers) so
      // adopting these tokens causes no visual regression.
      // ─────────────────────────────────────────────────────────────────────
      colors: {
        // Per-tenant primary brand color (multi-mountain plan M8). Resolves to the
        // `--color-primary` CSS variable that the `[mountain]` layout sets per
        // tenant; the fallback == geyang's shipped `brand.DEFAULT`, so surfaces
        // adopting `primary` are unchanged for geyang. Flat (no ramp) by design —
        // the minimal theming pass themes the signature CTA only; the `brand`
        // ramp below stays the static source of truth for everything else.
        primary: 'var(--color-primary, #FACC15)',
        // Brand yellow — the warm, playful core of the identity.
        // `brand.DEFAULT` == deployed yellow-400; the ramp is Tailwind's
        // yellow scale so tints/shades stay coherent.
        brand: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
          DEFAULT: '#FACC15',
        },
        // Accent orange — second stop of the CTA gradient and hover emphasis.
        // `accent.DEFAULT` == deployed orange-300.
        accent: {
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          DEFAULT: '#FDBA74',
        },
        // On-brand text. Deployed surfaces use pure black; `ink.DEFAULT` is a
        // warm near-black that reads softer on brand-yellow (the redesign's
        // "playful but refined" goal). `ink.soft` is the warm brown already in
        // the app for muted on-brand text.
        ink: {
          DEFAULT: '#1A1206',
          soft: '#3A2400',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
