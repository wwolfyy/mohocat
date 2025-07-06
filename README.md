# Mountain Cat Tracking Platform

A Next.js application for tracking and managing mountain cats with multi-tenant capabilities.

## 🎯 **Project Status**

### **Future-Proofing Implementation: COMPLETE** ✅
The platform has been successfully future-proofed for multi-tenant deployment:
- **Configuration System Foundation**: ✅ Complete
- **Service Layer Abstraction**: ✅ Complete
- **Static Data Cloud Storage Migration**: ✅ Complete

**📊 See [MULTI_TENANT_AUDIT_REPORT.md](./MULTI_TENANT_AUDIT_REPORT.md) for comprehensive implementation verification.**

### **Architecture Documentation**
- [Platform Architecture](./PLATFORM_ARCHITECTURE.md) - Multi-tenant platform overview
- [Configuration Implementation](./CONFIGURATION_IMPLEMENTATION.md) - Config system details
- [Service Layer Summary](./SERVICE_LAYER_SUMMARY.md) - Service abstraction details
- [Static Data Migration](./scripts/migration/README_cloud_storage_migration.md) - Cloud Storage migration details

## 🚀 **Major Features**

### **Static Data Performance**
- **Cloud Storage Integration**: All static data (cats, points, feeding spots) served from Google Cloud Storage
- **Build-Time Optimization**: Data exported to Cloud Storage during build process
- **Admin Management**: One-click data refresh through admin interface
- **CDN Caching**: Improved performance with Firebase Storage CDN

### **Multi-Tenant Ready**
- **Configuration-Driven**: Environment-specific Firebase projects
- **Service Layer**: Abstracted data access for easy deployment variations
- **Scalable Architecture**: Ready for multiple instances and tenants

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
npm run build  # This will export static data to Cloud Storage before building
firebase login
firebase use mountaincats-staging # .firebaserc is configured appropriately for different branches
firebase deploy --only hosting
```

## 📊 **Data Management**

### **Static Data**
All static data is now served from Google Cloud Storage for optimal performance:
- **Cats**: `/static-data/cats-static-data.json`
- **Points**: `/static-data/points-static-data.json`
- **Feeding Spots**: `/static-data/feeding-spots-static-data.json`

### **Admin Operations**
Use the admin interface at `/admin` to:
- View comprehensive statistics
- Refresh static data from Firestore to Cloud Storage
- Manage posts collections
- Monitor system health

### **Data Update Workflow**
1. Update data in Firestore through admin interface
2. Use admin panel buttons to refresh static data in Cloud Storage
3. Data is automatically served to all users with CDN caching