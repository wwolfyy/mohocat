# Graph Report - . (2026-07-28)

## Corpus Check

- 208 files · ~118,118 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1085 nodes · 2738 edges · 67 communities (48 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- Points API & Admin CMS
- Cat CMS & Cat Browser
- Login & My Page
- Firebase Auth Service
- Auth Context Provider
- Admin Shell & Sub-Pages
- Tenant Layout & Revalidation
- Post & Reply Components
- YouTube & Config Utilities
- Media Album Services
- Butler Pages & Analytics
- Navigation & FAQ
- Cat Info Display
- Account & Permission APIs
- Admin Media Filters
- Firebase Cat Service
- Service Factory Getters
- Photo Album & Lightbox
- Admin Auth & Types
- Upload Strategies
- Role & Playlist APIs
- Admin Dashboard & App Management
- Admin Auth Gate & UI Primitives
- Album Pages & Filters
- Modal Layer & Video Player
- Post Lists & Detail
- Firebase Announcement Service
- Simple Content Form & Upload
- Permission Service
- YouTube OAuth Routes
- Admin Media Tagging
- Tenant Home & Cache Config
- Announcements & Modal Context
- Permission Config Loader
- Firebase Adoption Service
- Firebase Butler Talk Service
- Firebase Post Service
- About Page & Content
- Feeding Spots Admin
- Firebase Image Service
- Firebase Video Service
- Admin Cats & Contact APIs
- Image Service Interface
- Video Service Interface
- Feeding Spots Service
- Storage Service
- Permission Types & Roles
- Permission Hooks
- Cat Gallery Grids
- Contact Service
- Thumbnail Preloader
- Config Directory Docs
- Butler Talk Form
- Edit Post Form
- YouTube Video Mutations
- About Content Service
- Role Assignment Service
- Post Collections API
- Root Layout
- Adoption Promotion
- Privacy Policy Page
- Terms of Use Page
- Media Batch Actions
- Media Pagination Bar
- Home Page Revalidate
- Adoption Page Revalidate
- Cats Page Revalidate

## God Nodes (most connected - your core abstractions)

1. `useMountain()` - 87 edges
2. `cn()` - 71 edges
3. `useAuth()` - 61 edges
4. `Cat` - 41 edges
5. `Button()` - 35 edges
6. `IPostService` - 34 edges
7. `requireApiPermission()` - 32 edges
8. `FirebaseAuthService` - 23 edges
9. `getCatService` - 22 edges
10. `IAuthService` - 22 edges

## Surprising Connections (you probably didn't know these)

- `AppManagementContent()` --calls--> `cn()` [EXTRACTED]
  src/app/[mountain]/admin/app-management/page.tsx → src/utils/cn.ts
- `AdminLayout()` --calls--> `cn()` [EXTRACTED]
  src/app/[mountain]/admin/layout.tsx → src/utils/cn.ts
- `MemberManagementPage()` --calls--> `cn()` [EXTRACTED]
  src/app/[mountain]/admin/members/page.tsx → src/utils/cn.ts
- `AdminPosts()` --calls--> `cn()` [EXTRACTED]
  src/app/[mountain]/admin/posts/page.tsx → src/utils/cn.ts
- `LoginContent()` --calls--> `cn()` [EXTRACTED]
  src/app/[mountain]/login/page.tsx → src/utils/cn.ts

## Import Cycles

- None detected.

## Communities (67 total, 19 thin omitted)

### Community 0 - "Points API & Admin CMS"

Cohesion: 0.05
Nodes (45): GET(), buildLabelSide(), emptyForm, labelSummary(), PointFormData, PointsCMSPage(), SideChoice, clampRound() (+37 more)

### Community 1 - "Cat CMS & Cat Browser"

Cohesion: 0.07
Nodes (44): CatFormData, CatsCMSPage(), initialFormData, birthYearLabel(), CatsBrowser(), HIDDEN_STATUSES, neuteredLabel(), neuteredShort() (+36 more)

### Community 2 - "Login & My Page"

Cohesion: 0.08
Nodes (31): LoginContent(), AnnouncementModal(), AnnouncementModalProps, formatKoreaDateTime(), EmailVerificationModal(), EmailVerificationModalProps, KakaoLoginGuidanceModal(), KakaoLoginGuidanceModalProps (+23 more)

### Community 4 - "Auth Context Provider"

Cohesion: 0.11
Nodes (22): MyPage(), Contact(), AuthActions, AuthContext, AuthContextType, AuthProvider(), AuthState, useAuthContext() (+14 more)

### Community 5 - "Admin Shell & Sub-Pages"

Cohesion: 0.13
Nodes (13): AdminLayout(), MemberManagementPage(), AdminPosts(), ALL_PERMISSIONS, ResourcePermissionConfig(), RESOURCES, RoleManagement(), UserCard() (+5 more)

### Community 6 - "Tenant Layout & Revalidation"

Cohesion: 0.16
Nodes (20): BAKED_SUBPATHS, bakedPaths(), POST(), generateStaticParams(), MountainLayout(), tenantPrimaryColorStyle(), Footer(), MountainProvider() (+12 more)

### Community 7 - "Post & Reply Components"

Cohesion: 0.10
Nodes (12): AdminReplyItemProps, AdminReplyList, AdminReplyListProps, AdminReplyListRef, PostListProps, ReplyFormProps, ReplyItemProps, ReplyList (+4 more)

### Community 8 - "YouTube & Config Utilities"

Cohesion: 0.11
Nodes (22): fetchChannelVideos(), getYouTubeConfig(), searchYouTubeVideos(), YouTubeVideo, AboutMainPhoto, AboutSection, DEFAULT_MAP_CONFIG, getDefaultMountainId() (+14 more)

### Community 9 - "Media Album Services"

Cohesion: 0.16
Nodes (22): addImageRecord(), addVideoRecord(), batchDeleteImages(), batchDeleteVideos(), batchUpdateImages(), batchUpdateVideos(), COLLECTIONS, deleteImageRecord() (+14 more)

### Community 10 - "Butler Pages & Analytics"

Cohesion: 0.15
Nodes (16): ButlerStreamContent(), ButlerTalkContent(), AnalyticsTracker(), AnalyticsTrackerContent(), Window, CatSelectorModal(), CatSelectorModalProps, FeedingSpotsList() (+8 more)

### Community 11 - "Navigation & FAQ"

Cohesion: 0.15
Nodes (15): AdminReplyItem(), LogoutModal(), NavigationBarLogin(), NavigationBarLogout(), FAQAccordion(), FAQItem, FAQProps, IntroCard() (+7 more)

### Community 12 - "Cat Info Display"

Cohesion: 0.17
Nodes (16): CatInfo(), CatInfoProps, getStatusEmoji(), CatLinkedText(), CatLinkedTextProps, imageFromUrl(), isYouTubeUrl(), useMediaLinks() (+8 more)

### Community 13 - "Account & Permission APIs"

Cohesion: 0.15
Nodes (13): PAGES, POST(), firebaseConfig, POST(), storage, ApiPermissionResult, app, auth (+5 more)

### Community 14 - "Admin Media Filters"

Cohesion: 0.15
Nodes (13): CatTagFieldProps, MediaFilterBarLabels, MediaFilterBarProps, SortOption, GRID_COLS, MediaStatCard, MediaStatsCardsProps, AutoParseReport (+5 more)

### Community 15 - "Firebase Cat Service"

Cohesion: 0.16
Nodes (4): FieldSpec, FirebaseCatService, ICatService, Cat

### Community 16 - "Service Factory Getters"

Cohesion: 0.22
Nodes (4): FeedingSpot, db, firebaseConfig, IFeedingSpotsService

### Community 17 - "Photo Album & Lightbox"

Cohesion: 0.16
Nodes (15): AdminImage, ImageSortKey, PhotoAlbum(), PhotoAlbumProps, Lightbox(), LightboxProps, useIsMobile(), getImageService (+7 more)

### Community 18 - "Admin Auth & Types"

Cohesion: 0.13
Nodes (17): createAdminUser(), getUserRole(), hasPermission(), requireAdminAuth(), useAdminAuth(), AdminCatResource, AdminDashboardStats, AdminImageResource (+9 more)

### Community 19 - "Upload Strategies"

Cohesion: 0.22
Nodes (15): POST(), SignedUrlImageContext, SignedUrlImageUpload, uploadImagesWithSignedUrls(), uploadVideoToYouTube(), YouTubeUploadOptions, RichContentFormConfig, useRichContentForm() (+7 more)

### Community 20 - "Role & Playlist APIs"

Cohesion: 0.22
Nodes (13): GET(), CONFIG_PATH, GET(), POST(), GET(), POST(), POST(), YOUTUBE_API_KEY (+5 more)

### Community 21 - "Admin Dashboard & App Management"

Cohesion: 0.16
Nodes (11): AppManagementContent(), AdminStats, TODO: Replace with post service when collection-specific methods are available, ContactManagement(), formatCreatedAt(), TokenInfo, YouTubeAuthPanel(), YouTubeAuthStatus (+3 more)

### Community 22 - "Admin Auth Gate & UI Primitives"

Cohesion: 0.15
Nodes (13): AdminAuth(), AdminAuthProps, Alert(), AlertProps, AlertVariant, VARIANT_CLASSES, Field(), FieldProps (+5 more)

### Community 23 - "Album Pages & Filters"

Cohesion: 0.23
Nodes (10): PhotoAlbumPage(), VideoAlbumPage(), AlbumFilterBar(), AlbumFilterBarProps, AlbumLoading(), AlbumMessage(), ResultCount(), MediaTileProps (+2 more)

### Community 24 - "Modal Layer & Video Player"

Cohesion: 0.20
Nodes (11): layerEscapeHandlers, LayerHandlers, layerStack, onGlobalPopState(), useModalLayer(), getYouTubeVideoId(), VideoPlayer(), VideoAlbum() (+3 more)

### Community 25 - "Post Lists & Detail"

Cohesion: 0.22
Nodes (12): AdminDashboard(), PostDetailsPage(), AdminPostList(), AdminPostListProps, formatKoreaDateTime(), Post, ButlerStreamClient(), ButlerTalkClient() (+4 more)

### Community 27 - "Simple Content Form & Upload"

Cohesion: 0.25
Nodes (11): LABELS, MediaUploadField(), MediaUploadFieldProps, uploadImagesToStorage(), uploadVideosToYouTube(), SimpleContentFormConfig, useSimpleContentForm(), NewAdoptionForm() (+3 more)

### Community 28 - "Permission Service"

Cohesion: 0.21
Nodes (4): usePermissionCheck(), PermissionService, PermissionConfig, PermissionLog

### Community 29 - "YouTube OAuth Routes"

Cohesion: 0.25
Nodes (10): GET(), GET(), checkToken(), GET(), TokenInfo, getStoredRefreshToken(), getYouTubeOAuthClient(), StoredRefreshToken (+2 more)

### Community 30 - "Admin Media Tagging"

Cohesion: 0.26
Nodes (12): sortDate(), TagImagesPage(), formatDuration(), sortDate(), TagVideosPage(), VideoSortKey, useYouTubeVideoMutations(), MediaGrid() (+4 more)

### Community 31 - "Tenant Home & Cache Config"

Cohesion: 0.32
Nodes (7): Home(), AdoptionGallery(), AdoptionPage(), CatsPage(), getAllCatsServer(), groupCatsByPoint(), getAllPointsServer()

### Community 32 - "Announcements & Modal Context"

Cohesion: 0.19
Nodes (8): AnnouncementDetailsPage(), AnnouncementClient(), formatKoreaDateTime(), AnnouncementModalContext, AnnouncementModalContextType, AnnouncementModalProvider(), AnnouncementModalProviderProps, getAnnouncementService

### Community 33 - "Permission Config Loader"

Cohesion: 0.24
Nodes (10): getAvailableRoles(), getDefaultRole(), getMountainAdminUsers(), getPermissionMatrix(), getRoleDetails(), isValidRole(), loadPermissionConfig(), Permission (+2 more)

### Community 37 - "About Page & Content"

Cohesion: 0.33
Nodes (9): About(), emphasizeCapitals(), AboutContentEditor(), useAboutPhoto(), UseAboutPhotoResult, AboutContent, getAboutContentService, getStorageService() (+1 more)

### Community 38 - "Feeding Spots Admin"

Cohesion: 0.22
Nodes (6): BasicFeedingSpot, NewPostPage(), AdminFeedingSpotsService, BasicFeedingSpot, FeedingSpot, getAdminFeedingSpotsService()

### Community 41 - "Admin Cats & Contact APIs"

Cohesion: 0.27
Nodes (10): POST(), GET(), POST(), ContactBody, LIMITS, parseBody(), POST(), sendNotification() (+2 more)

### Community 45 - "Storage Service"

Cohesion: 0.22
Nodes (3): storage, IStorageService, FirebaseStorageService

### Community 46 - "Permission Types & Roles"

Cohesion: 0.20
Nodes (4): MountainConfig, Role, UserPermissions, UserRole

### Community 47 - "Permission Hooks"

Cohesion: 0.33
Nodes (7): ResourceConfigData, RoleConfig, usePermissions(), fetcher(), ResourceConfig, useResourceAccess(), Permission

### Community 48 - "Cat Gallery Grids"

Cohesion: 0.22
Nodes (4): CatCircleGrid(), CatCircleGridProps, CatGalleryProps, CatGridSectionProps

### Community 49 - "Contact Service"

Cohesion: 0.33
Nodes (3): FirebaseContactService, IContactService, Contact

### Community 51 - "Config Directory Docs"

Cohesion: 0.25
Nodes (8): Cloud Run Autoscaling & Resource Policy, Container Health Probe (/api/health), mcathcat Cloud Run Service, Configuration Directory Layout, Deployment Configs, Firebase & Google Cloud Configs, Mountain Multi-Tenancy Config, Root-Level Tool Config Convention

### Community 52 - "Butler Talk Form"

Cohesion: 0.29
Nodes (4): LABELS, MediaItem, MediaItemList(), MediaItemListProps

### Community 53 - "Edit Post Form"

Cohesion: 0.38
Nodes (5): EDITABLE_POST_TYPES, EditPostPage(), EditablePostType, EditPostForm(), EditPostFormProps

### Community 54 - "YouTube Video Mutations"

Cohesion: 0.43
Nodes (6): AdminVideo, UseYouTubeVideoMutationsOptions, VideoServiceLike, DialogApi, VideoPlayerProps, CatVideo

### Community 57 - "Post Collections API"

Cohesion: 0.40
Nodes (3): POST(), TODO: Implement posts collections creation, TODO: Implement posts collections retrieval

### Community 58 - "Root Layout"

Cohesion: 0.40
Nodes (3): inter, metadata, viewport

### Community 59 - "Adoption Promotion"

Cohesion: 0.60
Nodes (4): AdoptionPostCard(), AdoptionPromotionClient(), formatKoreaDateTime(), youtubeId()

### Community 62 - "Media Batch Actions"

Cohesion: 0.50
Nodes (3): BatchActionsPanel(), BatchActionsPanelProps, GRID_COLS

## Knowledge Gaps

- **170 isolated node(s):** `CatFormData`, `initialFormData`, `AdminStats`, `SideChoice`, `PointFormData` (+165 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `useMountain()` connect `Butler Pages & Analytics` to `Points API & Admin CMS`, `Cat CMS & Cat Browser`, `Login & My Page`, `Auth Context Provider`, `Tenant Layout & Revalidation`, `YouTube & Config Utilities`, `Cat Info Display`, `Photo Album & Lightbox`, `Upload Strategies`, `Admin Dashboard & App Management`, `Admin Auth Gate & UI Primitives`, `Album Pages & Filters`, `Modal Layer & Video Player`, `Post Lists & Detail`, `Simple Content Form & Upload`, `Permission Service`, `Admin Media Tagging`, `Announcements & Modal Context`, `About Page & Content`, `Permission Hooks`, `Butler Talk Form`, `Edit Post Form`, `Adoption Promotion`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `cn()` connect `Navigation & FAQ` to `Announcements & Modal Context`, `Login & My Page`, `Auth Context Provider`, `Admin Shell & Sub-Pages`, `Simple Content Form & Upload`, `Butler Pages & Analytics`, `Cat Gallery Grids`, `Admin Dashboard & App Management`, `Edit Post Form`, `Admin Auth Gate & UI Primitives`, `Post Lists & Detail`, `Adoption Promotion`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `requireApiPermission()` connect `Role & Playlist APIs` to `Admin Cats & Contact APIs`, `Account & Permission APIs`, `Upload Strategies`, `Post Collections API`, `YouTube OAuth Routes`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `CatFormData`, `initialFormData`, `AdminStats` to the rest of the system?**
  _170 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Points API & Admin CMS` be split into smaller, more focused modules?**
  _Cohesion score 0.050203527815468114 - nodes in this community are weakly interconnected._
- **Should `Cat CMS & Cat Browser` be split into smaller, more focused modules?**
  _Cohesion score 0.07207792207792207 - nodes in this community are weakly interconnected._
- **Should `Login & My Page` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._
