/**
 * @hit/feature-pack-auth-core
 *
 * Core authentication UI feature pack.
 * Provides login, signup, forgot password, and email verification pages.
 */

import { login } from './pages/login';
import { signup } from './pages/signup';
import { forgot } from './pages/forgot';
import { verify } from './pages/verify';
import { reset } from './pages/reset';
import { magicLink } from './pages/magic-link';
import { totpSetup } from './pages/totp-setup';
import { deviceManagement } from './pages/device-management';
import { recoveryCodes } from './pages/recovery-codes';
import { navContributions } from './nav';
import { configSchema, configDefaults } from './config';
import type { FeaturePackModule, FeaturePackMetadata } from '@hit/feature-pack-types';

// Page generators - ui-render calls these
export const pages = {
  login,
  signup,
  forgot,
  verify,
  reset,
  magicLink,
  totpSetup,
  deviceManagement,
  recoveryCodes,
};

// Navigation contributions
export { navContributions };

// Config schema for CAC admin
export { configSchema, configDefaults };

// Feature pack metadata
export const metadata: FeaturePackMetadata = {
  name: 'auth-core',
  version: '1.0.0',
  description: 'Core authentication UI - login, signup, forgot password, email verification',
};

// Export the full module interface
const authCoreModule: FeaturePackModule = {
  pages,
  navContributions,
  configSchema,
  configDefaults,
  metadata,
};

export default authCoreModule;
