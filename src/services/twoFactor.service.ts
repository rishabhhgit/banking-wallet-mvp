import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { redis } from '../lib/redis';

const TWO_FA_PREFIX = '2fa:pending:';
const TWO_FA_SECRET_PREFIX = '2fa:secret:';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorVerifyResult {
  verified: boolean;
  token?: string;
}

// Generate a new 2FA secret for a user
export const generateTwoFactorSecret = async (userId: string, email: string): Promise<TwoFactorSetup> => {
  const secret = speakeasy.generateSecret({
    name: `BankingApp:${email}`,
    issuer: 'BankingApp',
    length: 20,
  });

  // Store the secret temporarily (not enabled yet)
  await redis.set(`${TWO_FA_PREFIX}${userId}`, secret.base32, 'EX', 300); // 5 min to complete setup

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!,
    qrCodeDataUrl,
  };
};

// Verify a 2FA code during setup
export const verifyTwoFactorSetup = async (userId: string, code: string): Promise<boolean> => {
  const pendingSecret = await redis.get(`${TWO_FA_PREFIX}${userId}`);
  
  if (!pendingSecret) {
    return false;
  }

  const verified = speakeasy.totp.verify({
    secret: pendingSecret,
    encoding: 'base32',
    token: code,
    window: 1, // Allow 1 step variance (30 seconds each)
  });

  if (verified) {
    // Store the confirmed secret
    await redis.set(`${TWO_FA_SECRET_PREFIX}${userId}`, pendingSecret, 'EX', 86400 * 365); // 1 year
    // Delete the pending secret
    await redis.del(`${TWO_FA_PREFIX}${userId}`);
  }

  return verified;
};

// Verify a 2FA code during login
export const verifyTwoFactorLogin = async (userId: string, code: string): Promise<TwoFactorVerifyResult> => {
  const secret = await redis.get(`${TWO_FA_SECRET_PREFIX}${userId}`);
  
  if (!secret) {
    return { verified: false };
  }

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  return { verified };
};

// Disable 2FA for a user
export const disableTwoFactor = async (userId: string): Promise<boolean> => {
  const existed = await redis.get(`${TWO_FA_SECRET_PREFIX}${userId}`);
  if (existed) {
    await redis.del(`${TWO_FA_SECRET_PREFIX}${userId}`);
    return true;
  }
  return false;
};

// Check if 2FA is enabled for a user
export const isTwoFactorEnabled = async (userId: string): Promise<boolean> => {
  const secret = await redis.get(`${TWO_FA_SECRET_PREFIX}${userId}`);
  return !!secret;
};
