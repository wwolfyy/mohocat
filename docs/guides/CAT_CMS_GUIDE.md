# Cat Management System (CMS)

## Overview

The Cat Management System provides a comprehensive interface for managing cat information directly in the Mountain Cats application. This replaces the need to manage cat data in Google Sheets, allowing for more efficient and streamlined cat information management.

## Features

### 🐱 **Cat Management**
- **View All Cats**: Browse through all cats with search and filtering capabilities
- **Add New Cats**: Create new cat profiles with detailed information
- **Edit Cats**: Update existing cat information
- **Delete Cats**: Remove cats from the system (with confirmation)
- **Search**: Find cats by name, alternative name, or description

### 📊 **Dashboard Statistics**
- Total cats count
- Active cats count
- Filtered results count

### 🔍 **Search & Filter**
- Real-time search across cat names, alternative names, and descriptions
- Filter by various cat attributes

### 📝 **Enhanced Form Features**
- **Larger Text Areas**: Description, character, sickness, and notes fields have larger input areas for better visibility
- **Editable Dropdowns**: Current and previous dwelling fields with smart autocomplete
- **Schema Alignment**: Perfect alignment with Firestore database schema
- **Dynamic Options**: Dropdown options automatically update as new values are added

## How to Use

### Accessing the CMS

1. Navigate to the admin dashboard at `/admin`
2. Click on "Manage Cats" card
3. You'll be taken to the Cat Management System at `/admin/cats`

### Adding a New Cat

1. Click the "Add New Cat" button
2. Fill in the cat information:
   - **Name** (required): The cat's primary name
   - **Alternative Name**: Any alternative names for the cat
   - **Sex**: Male/Female/Unknown
   - **Status**: 산냥이/집냥이/별냥이/행방불명
   - **Date of Birth**: Cat's birth date
   - **Thumbnail URL**: URL to the cat's profile image
   - **Current Dwelling**: Where the cat currently lives
   - **Previous Dwelling**: Where the cat used to live
   - **Description**: General description of the cat
   - **Character/Personality**: Personality traits
   - **Health/Sickness Notes**: Health-related information
3. Click "Save Cat" to create the new cat profile

### Editing a Cat

1. Find the cat you want to edit in the table
2. Click the edit icon (pencil) in the Actions column
3. Update the information in the form
4. Click "Save Cat" to save changes

### Deleting a Cat

1. Find the cat you want to delete in the table
2. Click the delete icon (trash) in the Actions column
3. Confirm the deletion in the popup dialog
4. The cat will be permanently removed from the system

### Searching for Cats

1. Use the search box at the top of the page
2. Type the cat's name, alternative name, or description
3. Results will update in real-time

## Enhanced Features

### 📝 **Improved Text Areas**

The Cat CMS now features larger, more user-friendly text input areas for long-form content:

- **Description Field**: Expanded to 5 rows for comprehensive cat descriptions
- **Character/Personality Field**: Expanded to 4 rows for detailed personality traits
- **Health/Sickness Notes Field**: Expanded to 4 rows for thorough health information
- **Special Notes Field**: Expanded to 4 rows for additional remarks

**Benefits:**
- **Less Scrolling**: See more content at once without scrolling within tiny text boxes
- **Better UX**: Easier to read and edit longer descriptions
- **Wider Modal**: Modal increased from `max-w-2xl` to `max-w-4xl` for better layout

### 🏠 **Smart Dwelling Dropdowns**

Both Current Dwelling and Previous Dwelling fields now feature intelligent editable dropdowns:

#### **How It Works:**
1. **Click the input field**: Opens dropdown showing all existing dwelling values
2. **Start typing**: Dropdown filters in real-time to matching values
3. **Click dropdown arrow**: Toggles dropdown open/closed
4. **Click an option**: Selects the value and closes dropdown
5. **Click outside**: Closes the dropdown
6. **Type new value**: Can enter values not in the existing list

#### **Smart Features:**
- **Dynamic Data Source**: Options are built from all existing dwelling values across all cats
- **Auto-Complete**: Type to filter existing options
- **Free Text Entry**: Not limited to existing options - can type completely new values
- **Self-Improving**: New dwelling values automatically become available for future use
- **Unified Options**: Both current and previous dwelling dropdowns share the same comprehensive list
- **Case-Insensitive Filtering**: Search works regardless of capitalization

#### **Example Workflow:**
1. **First time**: You type "Mountain Base Camp" as a new dwelling
2. **Save the cat**: The record is saved with this new dwelling value
3. **Next time**: "Mountain Base Camp" now appears in the dropdown for all future cat entries
4. **Growing database**: The more cats you add, the richer the dropdown options become

### 🎯 **Perfect Firestore Schema Alignment**

The Cat CMS has been updated to perfectly match the Firestore cats collection schema:

#### **Field Alignment:**
- **Birth Year Certainty**: Added `dob_certainty` field with "certain" and "uncertain" options
- **Sex Field**: Updated to use single letters (`M`, `F`, `U`) matching Firestore values
- **Date of Birth**: Changed to text input for year-only format (e.g., "2020")
- **Complete Field Coverage**: All Firestore fields are now editable in the CMS

#### **Benefits:**
- **No Data Loss**: All fields from Firestore can be edited through the CMS
- **Direct Mapping**: Form data maps 1:1 with Firestore documents
- **Type Safety**: Full TypeScript support with proper field validation
- **Consistent Data**: Ensures data consistency between CMS and database

## Data Structure

Each cat record contains the following fields:

```typescript
interface Cat {
  id: string;                // Unique identifier
  name: string;              // Primary name (required)
  alt_name?: string;         // Alternative name
  description?: string;      // Description
  thumbnailUrl: string;      // Profile image URL
  dwelling?: string;         // Current location
  prev_dwelling?: string;    // Previous location
  date_of_birth?: string;    // Birth year as string (e.g., "2020")
  dob_certainty?: string;    // "certain" or "uncertain"
  sex?: string;              // "M", "F", or "U"
  status?: string;           // 산냥이/집냥이/별냥이/행방불명
  character?: string;        // Personality traits
  sickness?: string;         // Health notes
  parents?: string;          // Parent/mother information
  offspring?: string;        // Children/offspring information
  isNeutered?: boolean;      // Neutering status
  note?: string;            // Special notes or remarks
}
```

### **Field Details:**

- **Required Fields**: Only `id`, `name`, and `thumbnailUrl` are required
- **Text Areas**: `description`, `character`, `sickness`, and `note` use larger text areas
- **Dropdowns**: `dwelling` and `prev_dwelling` use smart editable dropdowns
- **Enumerations**: `sex` and `dob_certainty` use predefined values
- **Boolean**: `isNeutered` uses a checkbox

## Migration from Google Sheets

### Before CMS
- Cat data was managed in Google Sheets
- `data_updater.js` script was used to sync data from Sheets to Firestore
- Manual process required for updates

### After CMS
- Cat data is managed directly in the application
- No need for Google Sheets for cat management
- Real-time updates to Firestore
- Immediate visibility of changes

### Transition Steps

1. **Export existing data**: If you have cats in Google Sheets, export them first
2. **Import to CMS**: Use the CMS interface to add any missing cats
3. **Update workflow**: Train team members on the new CMS interface
4. **Retire Google Sheets**: Once fully migrated, you can stop using Google Sheets for cat management

## Technical Details

### Architecture
- **Frontend**: React-based admin interface
- **Backend**: Firebase Firestore for data storage
- **Service Layer**: Uses the existing `CatService` for all CRUD operations
- **Authentication**: Protected by admin authentication

### API Endpoints
- `GET /api/admin/cats` - Fetch all cats
- Uses Firebase Firestore directly through the service layer for CRUD operations

### File Structure
```
src/app/admin/cats/
├── page.tsx              # Main CMS interface
└── ...

src/api/admin/cats/
├── route.ts              # API endpoints for cat management
└── ...
```

## Benefits

1. **Streamlined Management**: No need to switch between Google Sheets and the app
2. **Real-time Updates**: Changes are immediately reflected in the application
3. **Better User Experience**: Intuitive interface designed for cat management
4. **Data Integrity**: Form validation and proper data handling
5. **Search & Filter**: Easy to find specific cats
6. **Audit Trail**: Built-in tracking of changes (if needed)

## Future Enhancements

- **Bulk Import**: Import multiple cats from CSV/Excel files
- **Image Upload**: Direct image upload instead of URL entry
- **Advanced Filtering**: Filter by status, location, etc.
- **Bulk Operations**: Edit multiple cats at once
- **Export**: Export cat data to various formats
- **History**: Track changes to cat information over time

## Support

For issues or questions about the Cat Management System, please:
1. Check the error messages in the interface
2. Verify your admin permissions
3. Check the browser console for technical errors
4. Contact the system administrator

---

**Last Updated**: January 2025
**Version**: 1.0.0
