/**
 * Device Management Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_device_management?: boolean;
  show_device_trust?: boolean;
}

export async function deviceManagement(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  const authUrl = ctx.moduleUrls.auth;

  if (!options.show_device_management) {
    return {
      type: 'Container',
      children: [
        {
          type: 'Text',
          content: 'Device management is not available',
          variant: 'h2',
        },
      ],
    };
  }

  const children: UISpec[] = [];

  // Title
  children.push({
    type: 'Text',
    content: 'Manage Devices',
    variant: 'h2',
    className: 'mb-6',
  });

  // Description
  children.push({
    type: 'Text',
    content: 'View and manage devices that have access to your account',
    variant: 'body',
    className: 'mb-8 text-muted-foreground',
  });

  // Device list (fetched from API)
  children.push({
    type: 'DataTable',
    dataSource: {
      type: 'api',
      method: 'GET',
      url: `${authUrl}/devices`,
    },
    columns: [
      {
        key: 'name',
        label: 'Device Name',
        render: (device: any) => device.name || 'Unknown Device',
      },
      {
        key: 'user_agent',
        label: 'Browser/Device',
        render: (device: any) => {
          const ua = device.user_agent || '';
          // Simple user agent parsing
          if (ua.includes('Chrome')) return 'Chrome';
          if (ua.includes('Firefox')) return 'Firefox';
          if (ua.includes('Safari')) return 'Safari';
          return ua.substring(0, 50) || 'Unknown';
        },
      },
      {
        key: 'ip_address',
        label: 'IP Address',
      },
      {
        key: 'trusted',
        label: 'Trusted',
        render: (device: any) => (device.trusted ? 'Yes' : 'No'),
      },
      {
        key: 'last_used_at',
        label: 'Last Used',
        render: (device: any) => {
          if (!device.last_used_at) return 'Never';
          const date = new Date(device.last_used_at);
          return date.toLocaleDateString();
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (device: any) => [
          {
            type: 'Button',
            label: device.trusted ? 'Untrust' : 'Trust',
            variant: 'outline',
            size: 'sm',
            onClick: {
              type: 'api',
              method: 'POST',
              url: `${authUrl}/devices/${device.id}/trust`,
              onSuccess: {
                type: 'refresh',
              },
            },
          },
          {
            type: 'Button',
            label: 'Revoke',
            variant: 'destructive',
            size: 'sm',
            onClick: {
              type: 'api',
              method: 'DELETE',
              url: `${authUrl}/devices/${device.id}`,
              onSuccess: {
                type: 'refresh',
              },
            },
          },
        ],
      },
    ],
  });

  return {
    type: 'Container',
    maxWidth: 'lg',
    className: 'mx-auto p-6',
    children,
  };
}
