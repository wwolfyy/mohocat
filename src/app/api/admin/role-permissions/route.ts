import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Path to the permissions config file (fallback)
const CONFIG_PATH = path.join(process.cwd(), 'config', 'permissions.json');

export async function GET() {
    try {
        const configDoc = await db.collection('role_permissions').doc('role-config').get();

        if (configDoc.exists) {
            return NextResponse.json(configDoc.data());
        }

        // Fallback: Read from file if Firestore is empty, then seed Firestore
        if (fs.existsSync(CONFIG_PATH)) {
            const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(fileContent);

            // Seed Firestore
            await db.collection('role_permissions').doc('role-config').set(config);

            return NextResponse.json(config);
        }

        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    } catch (error) {
        console.error('Failed to read permission config:', error);
        return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roles } = body;

        if (!roles) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const configRef = db.collection('role_permissions').doc('role-config');

        // Get current config to merge
        let currentConfig = {};
        const configSnap = await configRef.get();
        if (configSnap.exists) {
            currentConfig = configSnap.data() || {};
        } else if (fs.existsSync(CONFIG_PATH)) {
            // Fallback to file if doc doesn't exist yet
            const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
            currentConfig = JSON.parse(fileContent);
        }

        // Merge changes
        const newConfig = {
            ...currentConfig,
            roles: {
                ...(currentConfig as any).roles,
                ...roles
            }
        };

        // Save to Firestore
        await configRef.set(newConfig);

        // Also update local file for backup/consistency if it exists
        if (fs.existsSync(CONFIG_PATH)) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
        }

        return NextResponse.json({ message: 'Configuration saved successfully', config: newConfig });
    } catch (error) {
        console.error('Failed to save permission config:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }
}
