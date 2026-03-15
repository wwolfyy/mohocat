# MOHOCAT (<ins>MO</ins>untain cat and <ins>HO</ins>use <ins>CAT</ins>)

## Mountain Cat Tracking Platform

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

### **Cat Management System (CMS)** 🐱

- **Direct Management**: Manage cat information directly in the application
- **No Google Sheets Required**: Eliminates the need for external spreadsheet management
- **Real-time Updates**: Changes are immediately reflected in the application
- **Comprehensive Interface**: Add, edit, delete, and search cats with ease
- **Data Validation**: Built-in validation ensures data integrity

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

## 🚀 **Deployment**

### **Current: Cloud Run (Recommended)**

The application is deployed using Google Cloud Run for optimal performance:

```bash
# Quick deployment
npm run cloud-run:deploy

# Or use the deployment script
scripts/deployment/deploy-cloud-run.sh  # Linux/Mac
scripts/deployment/deploy-cloud-run.bat # Windows
```

**Benefits of Cloud Run:**

- ✅ **70% faster image loading** with Next.js optimization
- ✅ **Auto-scaling** from 0 to multiple instances
- ✅ **Pay-per-use** pricing model
- ✅ **Full Next.js features** (API routes, SSR, image optimization)

See [Cloud Run Deployment Guide](./docs/guides/CLOUD_RUN_DEPLOYMENT.md) for detailed instructions.

### **Legacy: Firebase Hosting (Deprecated)**

The previous static export deployment to Firebase Hosting has been **deprecated** due to:

- ❌ No image optimization support
- ❌ Limited to static files only
- ❌ No server-side API routes
- ❌ Slower performance

See [Firebase Deployment Guide](./docs/guides/FIREBASE_DEPLOYMENT.md) for legacy documentation.

## 🖼️ **Image Optimization**

The application uses Next.js Image optimization for superior performance:

- **Automatic WebP conversion**: 70% smaller file sizes
- **Responsive serving**: Correct sizes for each device
- **Priority loading**: Critical images load first
- **Built-in caching**: Optimized cache strategy

See [Image Optimization Guide](./docs/implementation/IMAGE_OPTIMIZATION.md) for technical details.

## 📊 **Data Management**

### **Cat Management System (CMS)**

The platform now includes a comprehensive CMS for managing cats:

- **Access**: Navigate to `/admin/cats` from the admin dashboard
- **Features**: Add, edit, delete, and search cats
- **Real-time**: Changes are immediately saved to Firestore
- **Documentation**: See [CAT_CMS_GUIDE.md](./docs/guides/CAT_CMS_GUIDE.md) for detailed usage instructions

### **Static Data**

All static data is now served from Google Cloud Storage for optimal performance:

- **Cats**: `/static-data/cats-static-data.json`
- **Points**: `/static-data/points-static-data.json`
- **Feeding Spots**: `/static-data/feeding-spots-static-data.json`

### **Admin Operations**

Use the admin interface at `/admin` to:

- **Manage Cats**: Direct cat information management through the CMS
- **View Statistics**: Comprehensive statistics dashboard
- View comprehensive statistics
- Refresh static data from Firestore to Cloud Storage
- Manage posts collections
- Monitor system health

### **Data Update Workflow**

1. Update data in Firestore through admin interface
2. Use admin panel buttons to refresh static data in Cloud Storage
3. Data is automatically served to all users with CDN caching
