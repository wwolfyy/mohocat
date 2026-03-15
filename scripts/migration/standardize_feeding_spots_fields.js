/**
 * Migration script to standardize feeding spots field names
 * This script ensures all documents use 'last_attended' instead of 'last_attended_at'
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { cert } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(
  __dirname,
  '../../config/firebase/mountaincats-61543-7329e795c352.json'
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Firebase service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function standardizeFeedingSpotsFields() {
  console.log('Starting migration to standardize feeding spots field names...');

  try {
    const feedingSpotsRef = db.collection('feeding_spots');
    const snapshot = await feedingSpotsRef.get();

    console.log(`Found ${snapshot.size} feeding spot documents`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`Processing document ${doc.id}:`, {
        id: data.id,
        name: data.name,
        has_last_attended: !!data.last_attended,
        has_last_attended_at: !!data.last_attended_at,
        last_attended_value: data.last_attended,
        last_attended_at_value: data.last_attended_at,
      });

      const updates = {};
      let needsUpdate = false;

      // If document has last_attended_at but not last_attended, copy the value
      if (data.last_attended_at && !data.last_attended) {
        updates.last_attended = data.last_attended_at;
        needsUpdate = true;
        console.log(`  → Copying last_attended_at to last_attended`);
      }

      // If document has both fields, keep last_attended (the newer one) and remove last_attended_at
      if (data.last_attended_at && data.last_attended) {
        // Use whichever timestamp is more recent
        const lastAttendedTime = data.last_attended?.toDate?.() || new Date(data.last_attended);
        const lastAttendedAtTime =
          data.last_attended_at?.toDate?.() || new Date(data.last_attended_at);

        if (lastAttendedAtTime > lastAttendedTime) {
          updates.last_attended = data.last_attended_at;
          console.log(`  → Using last_attended_at as it's more recent`);
        } else {
          console.log(`  → Keeping last_attended as it's more recent or equal`);
        }
      }

      // Always remove last_attended_at if it exists
      if (data.last_attended_at) {
        updates.last_attended_at = db.FieldValue.delete();
        needsUpdate = true;
        console.log(`  → Removing last_attended_at field`);
      }

      if (needsUpdate) {
        await doc.ref.update(updates);
        migratedCount++;
        console.log(`  ✓ Updated document ${doc.id}`);
      } else {
        skippedCount++;
        console.log(`  - Skipped document ${doc.id} (no changes needed)`);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Documents migrated: ${migratedCount}`);
    console.log(`Documents skipped: ${skippedCount}`);
    console.log(`Total documents: ${snapshot.size}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
standardizeFeedingSpotsFields()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
