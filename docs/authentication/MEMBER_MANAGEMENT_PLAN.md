# Mountain Cats Authentication & Member Management Plan

**Version**: 2.0
**Last Updated**: June 29, 2025
**Status**: Planning Phase

## 📋 **Overview**

This document outlines the comprehensive authentication and member management system for the Mountain Cats multi-tenant platform. The system uses centralized user management with distributed mountain-specific data to support cross-mountain access while maintaining cost attribution.

## 🏗️ **Architecture Overview**

### **Centralized Authentication Service**
- **Project**: `mountain-cats-users` (Firebase)
- **Purpose**: Single source of truth for user identity and authentication
- **Responsibilities**:
  - SMS-based phone authentication
  - User identity management
  - Cross-mountain access control
  - SMS cost attribution tracking

### **Mountain-Specific Services**
- **Projects**: `geyang-cats`, `jirisan-cats`, etc.
- **Purpose**: Mountain-specific data and operations
- **Responsibilities**:
  - Cat data and media
  - Mountain-specific content
  - Local analytics and reporting
  - Mountain-specific asset storage

## 👥 **User Roles & Permissions**

### **Role Hierarchy**
1. **admin**: Full mountain management access
   - Permissions: `["manage-cats", "manage-posts", "manage-users", "view-analytics", "manage-settings", "export-data"]`

2. **butler-ground**: Physical cat care management
   - Permissions: `["manage-cats", "manage-posts", "view-analytics"]`

3. **butler-internet**: Digital content management
   - Permissions: `["manage-posts", "view-analytics"]`

4. **viewer**: Read-only access
   - Permissions: `["view-analytics"]`

### **Cross-Mountain Access**
- Users can have different roles in different mountains
- Example: Admin in Geyang, Butler-online in Jirisan
- Each mountain admin manages access for their mountain only

## 🗄️ **Data Structure**

### **Central User Service Collections**

#### **butlers Collection**
```javascript
// butlers/{userId}
{
  uid: "firebase-auth-uid",
  phoneNumber: "+82-10-xxxx-xxxx", // UNIQUE identifier

  // Identity verification tracking
  identityVerification: {
    phoneVerified: true,
    phoneVerifiedAt: timestamp,
    verificationCount: 3,
    lastVerificationAt: timestamp,
    mountainVerifications: {
      "geyang": { verifiedAt: timestamp, verificationCount: 2 },
      "jirisan": { verifiedAt: timestamp, verificationCount: 1 }
    }
  },

  profile: {
    displayName: "김철수",
    email: "user@example.com", // optional
    isVerified: true,
    registrationSource: "geyang" // first mountain
  },

  // Mountain-specific roles
  mountainRoles: {
    "geyang": {
      role: "admin",
      permissions: ["manage-cats", "manage-posts", "manage-users"],
      status: "active" | "pending" | "suspended",
      assignedBy: "admin-uid",
      assignedAt: timestamp,
      requestedAt: timestamp,
      approvedAt: timestamp
    },
    "jirisan": {
      role: "butler-internet",
      status: "pending",
      assignedBy: null,
      assignedAt: null,
      requestedAt: timestamp,
      approvedAt: null
    }
  },

  // SMS cost attribution
  smsAttribution: {
    registrationMountain: "geyang",
    verificationCount: 3,
    lastVerification: timestamp
  },

  createdAt: timestamp,
  lastLogin: timestamp,
  lastActiveAt: timestamp
}
```

#### **mountainAccess Collection**
```javascript
// mountainAccess/{requestId}
{
  userId: "butler-id",
  mountainId: "jirisan",
  requestType: "new-user" | "additional-mountain",
  existingMountains: ["geyang"], // if additional-mountain
  requestedRole: "viewer",
  status: "pending" | "approved" | "rejected",

  // Identity verification details
  verificationDetails: {
    phoneNumber: "+82-10-xxxx-xxxx",
    verifiedAt: timestamp,
    smsLogId: "sms-log-123",
    isExistingUser: true
  },

  requestMessage: "I want to help with Jirisan cats",
  requestedAt: timestamp,
  reviewedAt: timestamp,
  reviewedBy: "admin-uid",
  rejectionReason: "string" // if rejected
}
```

#### **smsLogs Collection**
```javascript
// smsLogs/{logId}
{
  userId: "butler-id",
  phoneNumber: "+82-10-xxxx-xxxx",
  mountainAttribution: "jirisan", // which mountain pays
  type: "registration" | "login" | "mountain-access-request",

  // Identity context
  userContext: {
    isExistingUser: true,
    existingMountains: ["geyang"],
    userId: "butler-123"
  },

  cost: 0.006, // USD
  timestamp: timestamp,
  success: true,
  errorMessage: "string" // if failed
}
```

#### **monthlySmsReport Collection**
```javascript
// monthlySmsReport/{year-month}
{
  period: "2025-06",
  mountainCosts: {
    "geyang": {
      totalCost: 15.67,
      verificationCount: 156,
      breakdown: {
        newRegistrations: { count: 23, cost: 1.38 },
        additionalMountainRequests: { count: 8, cost: 0.048 },
        loginVerifications: { count: 125, cost: 0.75 }
      }
    },
    "jirisan": {
      totalCost: 8.42,
      verificationCount: 89,
      breakdown: {
        newRegistrations: { count: 12, cost: 0.072 },
        additionalMountainRequests: { count: 3, cost: 0.018 },
        loginVerifications: { count: 74, cost: 0.444 }
      }
    }
  },
  generatedAt: timestamp
}
```

## 🔄 **User Access Flow**

### **New User Registration**

1. **User visits mountain's 동참 page**
   - Enters phone number
   - Selects desired mountain

2. **SMS Verification**
   - System sends SMS verification code
   - Cost attributed to requesting mountain
   - Always required regardless of existing account

3. **Identity Check**
   - System checks if phone number exists in butlers collection
   - If new: Create new butler record
   - If existing: Skip to step 5

4. **New Butler Creation**
   ```javascript
   // Create new butler record
   {
     phoneNumber: "+82-10-xxxx-xxxx",
     profile: { registrationSource: "geyang" },
     mountainRoles: {
       "geyang": { role: "viewer", status: "pending" }
     }
   }
   ```

5. **Access Request Creation**
   ```javascript
   // Create access request
   {
     userId: "butler-id",
     mountainId: "geyang",
     requestType: "new-user", // or "additional-mountain"
     status: "pending"
   }
   ```

6. **Admin Notification**
   - Mountain admins notified of new request
   - Email/SMS notification sent

### **Cross-Mountain Access Request**

1. **Existing user visits new mountain's 동참 page**
   - Enters phone number (already in system)

2. **SMS Verification (Always Required)**
   - SMS sent and verified
   - Cost attributed to new mountain
   - Security measure for all requests

3. **Identity Matching**
   - System finds existing butler record by phone number
   - Links new mountain request to existing account

4. **Additional Mountain Request**
   ```javascript
   {
     userId: "existing-butler-id",
     mountainId: "jirisan",
     requestType: "additional-mountain",
     existingMountains: ["geyang"],
     status: "pending"
   }
   ```

5. **Enhanced Admin Review**
   - Admin sees user's existing mountain access
   - Can make informed approval decision

## 🔐 **Security & Authentication**

### **Identity Verification Rules**
- **Primary Key**: Phone number serves as unique identifier
- **SMS Required**: Every access request requires SMS verification
- **Cost Attribution**: Each mountain pays for their SMS verifications
- **Audit Trail**: All verifications logged with attribution

### **Admin Access Control**
- Mountain admins can only see users with access to their mountain
- Cannot view or modify users' access to other mountains
- Full CRUD operations for their mountain's user roles

### **Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Mountain admins can read users who have access to their mountain
    match /butlers/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId ||
         isMountainAdmin(request.auth.uid, getUserMountains(userId)));

      allow write: if request.auth != null &&
        isMountainAdmin(request.auth.uid, getModifiedMountains());
    }

    // Access requests - mountain-specific access
    match /mountainAccess/{requestId} {
      allow read, write: if request.auth != null &&
        isMountainAdmin(request.auth.uid, resource.data.mountainId);
    }

    // SMS logs - read-only for admins
    match /smsLogs/{logId} {
      allow read: if request.auth != null &&
        isAdminOfMountain(request.auth.uid, resource.data.mountainAttribution);
      allow write: if false; // Only cloud functions
    }
  }
}
```

### **JWT Token Structure**
```javascript
// JWT payload for cross-mountain access
{
  uid: "firebase-auth-uid",
  phoneNumber: "+82-10-xxxx-xxxx",
  mountainRoles: {
    "geyang": { role: "admin", permissions: [...] },
    "jirisan": { role: "butler-online", permissions: [...] }
  },
  iat: timestamp,
  exp: timestamp // 24 hours
}
```

## 🛡️ **Fallback Strategy**

### **Firebase Built-in Reliability**
- **99.95% uptime SLA** for Firebase Authentication
- **Multi-region replication** for Firestore
- **Automatic failover** in Firebase infrastructure

### **Application-Level Fallbacks**

#### **Authentication Service Down**
```javascript
if (centralAuthService.isDown()) {
  // Use cached JWT tokens (24-hour validity)
  // Enable read-only mode
  // Display service status banner
  // Queue pending authentication requests
}
```

#### **User Data Service Down**
```javascript
if (centralUserService.isDown()) {
  // Use cached mountain roles from JWT
  // Allow basic functionality with cached permissions
  // Sync changes when service returns
  // Log all actions for later processing
}
```

#### **Admin Panel Fallback**
```javascript
if (cannotReachCentralService()) {
  // Show cached user list with last known status
  // Queue admin actions (approve/reject/role changes)
  // Send email notifications for urgent requests
  // Process queue when service returns
}
```

## 📊 **Admin Interface Features**

### **Mountain Admin Dashboard**

#### **User Management Section**
- **User List**: All users with access to admin's mountain
- **Pending Requests**: New access requests requiring approval
- **Role Management**: Change user roles within mountain
- **User Activity**: Login and action history
- **SMS Cost Report**: Monthly attribution costs

#### **User Profile View**
```
User Profile: 김철수
Phone: +82-10-****-5678
Status: Active

Current Mountain Access:
- Geyang: Admin (since 2025-06-01)
- Jirisan: Pending Review

Recent Activity:
- Login: 2025-06-29 14:30
- Cat Update: 2025-06-29 12:15
- Post Created: 2025-06-28 16:45

Actions Available:
[Change Role] [Suspend User] [View Activity Log]
```

#### **Cross-Mountain Request Review**
```
Access Request from Existing User

User: 김철수 (+82-10-****-5678)
Existing Access: Geyang (Admin since 2025-06-01)
Requested Role: Viewer
Message: "I want to help with Jirisan cats too"
Verified: 2025-06-29 14:05 (SMS)

[Approve] [Reject] [Request More Info]
```

## 💰 **Cost Management**

### **SMS Cost Attribution**
- Each mountain pays for SMS verifications they trigger
- New user registrations attributed to registration mountain
- Cross-mountain requests attributed to target mountain
- Monthly reports show detailed breakdown

### **Cost Optimization**
- JWT tokens valid for 24 hours (reduce re-authentication)
- Cached user permissions (reduce database queries)
- Batch SMS operations where possible
- Test phone numbers for development

### **Monthly Report Example**
```
SMS Cost Report - June 2025

Geyang Mountain: $15.67
├── New registrations: 23 users ($1.38)
├── Cross-mountain requests: 5 users ($0.30)
└── Login verifications: 125 sessions ($7.50)

Jirisan Mountain: $8.42
├── New registrations: 12 users ($0.72)
├── Cross-mountain requests: 3 users ($0.18)
└── Login verifications: 74 sessions ($4.44)

Total Platform Cost: $24.09
```

## 🚀 **Implementation Timeline**

### **Phase 1: Central Service Setup (Weeks 1-2)**
- [ ] Create `mountain-cats-users` Firebase project
- [ ] Configure SMS authentication for Korea region
- [ ] Design and implement Firestore collections
- [ ] Set up security rules
- [ ] Create Cloud Functions for user management APIs

### **Phase 2: Admin Interface (Weeks 3-4)**
- [ ] Build admin API endpoints for user management
- [ ] Create admin dashboard UI components
- [ ] Implement role-based access control
- [ ] Build SMS cost reporting system
- [ ] Add user approval/rejection workflows

### **Phase 3: User Registration (Weeks 5-6)**
- [ ] Update 동참 page for new registration flow
- [ ] Integrate SMS verification with central service
- [ ] Build access request submission system
- [ ] Create user notification system (email/SMS)
- [ ] Add cross-mountain request handling

### **Phase 4: Integration & Testing (Weeks 7-8)**
- [ ] Implement JWT token system for cross-mountain auth
- [ ] Update mountain applications to verify against central service
- [ ] Build and test fallback mechanisms
- [ ] Conduct load testing for SMS verification
- [ ] End-to-end testing of all user flows

### **Phase 5: Deployment & Monitoring (Week 9)**
- [ ] Deploy central authentication service
- [ ] Migrate existing development data
- [ ] Set up monitoring and alerting
- [ ] Train mountain admins on new system
- [ ] Go live with phased rollout

## 🔍 **Edge Cases & Considerations**

### **Phone Number Changes**
- Future feature: Allow verified phone number updates
- Maintain history of previous phone numbers
- Require SMS verification for changes
- Update all mountain access records

### **Shared Phone Numbers**
- Policy: One phone number = one account
- Family members sharing phone share the account
- Individual access requires individual phone numbers
- Clear documentation of this limitation

### **International Expansion**
- SMS regions configurable per mountain
- Support for multiple country codes
- Localized SMS message templates
- Regional cost tracking and attribution

### **Account Suspension**
- Mountain-specific suspension (doesn't affect other mountains)
- Platform-wide suspension for serious violations
- Clear appeal process for suspended users
- Audit trail for all suspension actions

### **Data Privacy & GDPR**
- User data deletion requests
- Mountain-specific data retention policies
- Export user data functionality
- Privacy-compliant logging and monitoring

## 📚 **Related Documentation**

- [Firebase Deployment Guide](./FIREBASE_DEPLOYMENT.md)
- [Configuration Implementation](../implementation/CONFIGURATION_IMPLEMENTATION.md)
- [Platform Architecture](../architecture/PLATFORM_ARCHITECTURE.md)
- [About Photo Upload Guide](./ABOUT_PHOTO_UPLOAD.md)
- [Multi-Tenant Audit Report](../implementation/MULTI_TENANT_AUDIT_REPORT.md)

---

**Document Status**: Planning Phase
**Next Review**: After Phase 1 completion
**Maintainer**: Development Team
**Approval Required**: Mountain Admins & Platform Owners
