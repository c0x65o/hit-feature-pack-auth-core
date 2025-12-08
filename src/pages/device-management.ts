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
      type: 'Page',
      children: [
        {
          type: 'Alert',
          variant: 'error',
          title: 'Device management is not available',
          message: 'Device management is not enabled',
        },
      ],
    };
  }

  return {
    type: 'Page',
    title: 'Manage Devices',
    description: 'View and manage devices that have access to your account',
    children: [
      {
        type: 'DataTable',
        endpoint: `${authUrl}/devices`,
        columns: [
          { key: 'name', label: 'Device Name', type: 'text' },
          { key: 'user_agent', label: 'Browser/Device', type: 'text' },
          { key: 'ip_address', label: 'IP Address', type: 'text' },
          { key: 'trusted', label: 'Trusted', type: 'badge' },
          { key: 'last_used_at', label: 'Last Used', type: 'datetime' },
        ],
        pageSize: 25,
        emptyMessage: 'No devices found',
      },
    ],
  };
}
