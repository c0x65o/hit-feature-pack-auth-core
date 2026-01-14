import type { NextRequest } from 'next/server';
export declare function sendInviteEmail(req: NextRequest, args: {
    to: string;
    inviteUrl: string;
}): Promise<void>;
export declare function sendPasswordResetEmail(req: NextRequest, args: {
    to: string;
    resetUrl: string;
}): Promise<void>;
export declare function sendVerifyEmail(req: NextRequest, args: {
    to: string;
    verifyUrl: string;
    code?: string | null;
}): Promise<void>;
export declare function sendMagicLinkEmail(req: NextRequest, args: {
    to: string;
    magicUrl: string;
}): Promise<void>;
//# sourceMappingURL=email-adapter.d.ts.map