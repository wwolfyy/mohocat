# Mountain Cat Tracking Platform

A Next.js application for tracking and managing mountain cats with multi-tenant capabilities.

## 🎯 **Project Status**

### **Future-Proofing Implementation: COMPLETE** ✅
The platform has been successfully future-proofed for multi-tenant deployment:
- **Configuration System Foundation**: ✅ Complete
- **Service Layer Abstraction**: ✅ Complete

**📊 See [MULTI_TENANT_AUDIT_REPORT.md](./MULTI_TENANT_AUDIT_REPORT.md) for comprehensive implementation verification.**

### **Architecture Documentation**
- [Platform Architecture](./PLATFORM_ARCHITECTURE.md) - Multi-tenant platform overview
- [Configuration Implementation](./CONFIGURATION_IMPLEMENTATION.md) - Config system details
- [Service Layer Summary](./SERVICE_LAYER_SUMMARY.md) - Service abstraction details

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy on Firebase

The project is set to deploy the app the Firebase hosting.
- Production project: mountaincats
- Staging project: mountaincats-staging

To deploy the app:
```bash
npm run build
firebase login
firebase use mountaincats-staging # .firebaserc is configured appropriately for different branches
firebase deploy --only hosting
```