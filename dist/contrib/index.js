'use client';
/**
 * Auth-core contrib
 *
 * Provides schema-driven action handlers for auth entities.
 */
import { getEntityActionHandler } from '../ui/entityActions';
export const contrib = {
    actionHandlers: {
        'auth.verifyEmail': async ({ entityKey, record }) => {
            if (!record) {
                throw new Error('Open a user record to verify their email.');
            }
            if (record?.email_verified === true) {
                throw new Error('Email is already verified.');
            }
            const handler = getEntityActionHandler('auth.verifyEmail');
            if (!handler)
                throw new Error('Missing auth handler: auth.verifyEmail');
            await handler({ entityKey, record });
        },
    },
};
export default contrib;
//# sourceMappingURL=index.js.map