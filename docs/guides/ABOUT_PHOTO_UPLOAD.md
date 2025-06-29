# About Page Photo Upload Guide

This guide explains how to upload and configure photos for the about page in the Mountain Cats application.

## Firebase Storage Location

About page photos are stored in Firebase Storage under the following structure:

```
/about-photos/[mountain-id]/[photo-filename]
```

Examples:
- `/about-photos/geyang/about-main-geyang.jpg`
- `/about-photos/jirisan/about-main-jirisan.jpg`

**Multi-Tenant Setup**: Each mountain has its own Firebase project and storage, but uses the same folder structure. The application automatically resolves the correct photo path based on the `MOUNTAIN_ID` environment variable.

## Step-by-Step Upload Process

### Single Mountain Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `mountaincats-61543`)
3. Navigate to **Storage** in the left sidebar
4. Click on the **Files** tab
5. Create the folder structure:
   - Click **Create folder** → `about-photos`
   - Inside `about-photos`, create your mountain folder (e.g., `geyang`)
6. Upload your photo:
   - Navigate to `/about-photos/[your-mountain-id]/`
   - Click **Upload file**
   - Select your prepared photo
   - Wait for upload to complete

### Multi-Tenant Deployment

For each mountain's Firebase project:

#### **Mountain 1: Geyang**
1. Access **Geyang's Firebase Console** (project: `mountaincats-61543`)
2. Storage > Files > Create folder: `about-photos/geyang/`
3. Upload: `about-main-geyang.jpg`

#### **Mountain 2: Jirisan**
1. Access **Jirisan's Firebase Console** (project: `jirisan-cats-project`)
2. Storage > Files > Create folder: `about-photos/jirisan/`
3. Upload: `about-main-jirisan.jpg`

#### **Mountain N: New Mountain**
1. Access **New Mountain's Firebase Console**
2. Storage > Files > Create folder: `about-photos/[new-mountain-id]/`
3. Upload: `about-main-[new-mountain-id].jpg`

### 3. Configure in mountains.json

Edit `config/mountains/mountains.json` to add the photo configuration:

**Single Mountain:**
```json
{
  "your-mountain-id": {
    "about": {
      "title": "Your About Title",
      "mainContent": "Your main content...",
      "mainPhoto": {
        "filename": "about-main-your-mountain-id.jpg",
        "caption": "A beautiful caption describing your photo",
        "altText": "Descriptive alt text for accessibility"
      },
      "sections": [
        // your sections...
      ]
    }
  }
}
```

**Multi-Tenant Setup:**
```json
{
  "geyang": {
    "about": {
      "mainPhoto": {
        "filename": "about-main-geyang.jpg",
        "caption": "2020년 1월 19일 해질 무렵. 추위가 좀 풀린 틈을 타 같이 햇볕을 쬐고 있는 계양산 최고의 절친 아롱이(오른쪽)와 개똥이.",
        "altText": "개똥이와 아롱이"
      }
    }
  },
  "jirisan": {
    "about": {
      "mainPhoto": {
        "filename": "about-main-jirisan.jpg",
        "caption": "지리산의 아름다운 자연 속에서 평화롭게 지내는 고양이들",
        "altText": "지리산 고양이들의 모습"
      }
    }
  }
}
```

### 4. Deploy Changes

**Single Mountain Deployment:**
```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

**Multi-Tenant Deployment:**
```bash
# Deploy to Geyang mountain
MOUNTAIN_ID=geyang npm run build
firebase deploy --only hosting --project geyang

# Deploy to Jirisan mountain
MOUNTAIN_ID=jirisan npm run build
firebase deploy --only hosting --project jirisan

# Deploy to additional mountains as needed
MOUNTAIN_ID=[mountain-id] npm run build
firebase deploy --only hosting --project [mountain-project]
```

**Important**: Each deployment automatically loads the correct photo based on the `MOUNTAIN_ID` environment variable. The application resolves the storage path as `/about-photos/[MOUNTAIN_ID]/[filename]`.

## File Naming Conventions

### Main About Photo
- Pattern: `about-main-[mountain-id].[extension]`
- Examples:
  - `about-main-geyang.jpg`
  - `about-main-jirisan.jpg`
  - `about-main-seoraksan.webp`

### Additional Photos (Future Use)
- Pattern: `about-[purpose]-[mountain-id].[extension]`
- Examples:
  - `about-team-geyang.jpg`
  - `about-location-jirisan.jpg`
  - `about-mission-seoraksan.webp`

## Photo Guidelines

### Technical Requirements
- **Aspect Ratio**: 3:2 (landscape) or 4:3 recommended
- **Resolution**: At least 1200px wide
- **File Size**: Under 500KB
- **Format**: JPG (best compatibility) or WebP (best compression)

### Content Guidelines
- **Subject**: Should relate to your mountain or cat community
- **Quality**: High resolution, well-lit, sharp focus
- **Composition**: Consider text overlay space if needed
- **Rights**: Ensure you have rights to use the image

### Accessibility
- **Alt Text**: Provide descriptive alt text in the configuration
- **Caption**: Add meaningful captions that add context
- **Contrast**: Ensure good contrast if text will overlay the image

## Testing Your Configuration

After uploading and configuring:

1. **Local Testing**:
   ```bash
   npm run dev
   ```
   Navigate to `/pages/about` to see your photo

2. **Build Testing**:
   ```bash
   npm run build
   npm start
   ```

3. **Check Console**: Look for any loading errors in browser console

## Troubleshooting

### Photo Not Loading
- Check Firebase Storage permissions
- Verify the file path matches the configuration
- Ensure the file was uploaded successfully
- Check browser network tab for 404 errors

### Slow Loading
- Optimize image file size
- Use WebP format for better compression
- Consider using responsive images

### Configuration Not Updating
- Clear browser cache
- Verify the JSON syntax in mountains.json
- Restart the development server
- Check for build errors

## Security Considerations

### Firebase Storage Rules for Multi-Tenant Setup

Each mountain's Firebase project needs the following storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to about photos for the current mountain
    match /about-photos/{mountainId}/{allPaths=**} {
      allow read: if true;
    }

    // Allow public read access to media (photos, videos, thumbnails)
    match /media/{allPaths=**} {
      allow read: if true;
    }

    // Restrict write access to authenticated users only
    match /{allPaths=**} {
      allow write: if request.auth != null;
    }
  }
}
```

### Applying Security Rules

**For Each Mountain's Firebase Project:**
1. Go to Firebase Console > Storage > Rules
2. Replace the existing rules with the above configuration
3. Click **"Publish"** to deploy the rules
4. Test by accessing your about page to ensure photos load correctly

### Security Notes

- **Public Read Access**: About photos are publicly readable for optimal performance
- **Write Protection**: Only authenticated users can upload/modify files
- **Mountain Isolation**: Each mountain only accesses its own `/about-photos/[mountain-id]/` folder
- **Cross-Origin Access**: Rules allow web access from your deployed domains

The current setup allows public read access to about photos. This is intentional for the about page display. If you need to restrict access in the future, you'll need to:

1. Update Firebase Storage security rules
2. Implement authentication checks
3. Use signed URLs for restricted access

## Related Documentation

- [Firebase Deployment Guide](FIREBASE_DEPLOYMENT.md)
- [Configuration Implementation](../implementation/CONFIGURATION_IMPLEMENTATION.md)
- [Platform Architecture](../architecture/PLATFORM_ARCHITECTURE.md)
