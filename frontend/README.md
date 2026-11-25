# PrepVela frontend

The frontend is a React single-page application built with Vite and Tailwind CSS. See the [project README](../README.md) for full-stack setup instructions and [Frontend Deployment](../docs/FRONTEND_DEPLOYMENT.md) for production hosting guidance.

## Development

```sh
npm ci
```

Copy `.env.example` to `.env.local`, then start the development server:

```sh
npm run dev
```

Available scripts:

- `npm run build` creates the production bundle in `dist/`.
- `npm run lint` runs Oxlint.
- `npm run preview` serves a local preview of the production bundle.
