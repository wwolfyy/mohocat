import useSWR from 'swr';
import { usePermissions } from './usePermissions';
import { Permission } from '@/types/permissions';

interface ResourceConfig {
    resources: Record<string, Permission[]>;
}

const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch resource permissions');
    }
    return response.json();
};

export function useResourceAccess() {
    const { permissions, isLoading: permissionsLoading } = usePermissions();

    // Use SWR for caching and automatic deduplication
    // revalidateOnFocus: false to avoid unnecessary refetches when switching windows
    const { data: config, error, isLoading: configLoading } = useSWR<ResourceConfig>(
        '/api/admin/resource-permissions',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // cache for 1 minute
        }
    );

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
        isLoading: permissionsLoading || configLoading,
        error
    };
}
