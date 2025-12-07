import { useState, useEffect } from 'react';
import { usePermissions } from './usePermissions';
import { Permission } from '@/types/permissions';

interface ResourceConfig {
    resources: Record<string, Permission[]>;
}

export function useResourceAccess() {
    const { permissions, isLoading: permissionsLoading } = usePermissions();
    const [config, setConfig] = useState<ResourceConfig | null>(null);
    const [configLoading, setConfigLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/api/admin/resource-permissions');
                if (response.ok) {
                    const data = await response.json();
                    setConfig(data);
                }
            } catch (error) {
                console.error('Failed to load resource permissions:', error);
            } finally {
                setConfigLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const canAccessResource = (resourceId: string): boolean => {
        if (permissionsLoading || configLoading || !config) return false;

        const requiredPermissions = config.resources[resourceId];

        // If no permissions are required (array is empty or undefined), it's public
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        // Check if user has AT LEAST ONE of the required permissions (OR logic as per UI note)
        return requiredPermissions.some(perm => permissions.includes(perm));
    };

    return {
        canAccessResource,
        isLoading: permissionsLoading || configLoading
    };
}
