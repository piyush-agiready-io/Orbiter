jest.mock('@/config/env', () => ({
  env: {
    ENCRYPTION_KEY: 'a'.repeat(64),
  },
}));

import { encrypt, decrypt } from '@/shared/lib/encryption';

describe('EnvVariableService encryption logic', () => {
  it('encrypts a value and can decrypt it back', () => {
    const value = 'sk_live_abc123xyz';
    const { encrypted, iv, authTag } = encrypt(value);
    expect(encrypted).not.toBe(value);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(value);
  });

  it('handles multiline values', () => {
    const value = '-----BEGIN RSA KEY-----\nline1\nline2\n-----END RSA KEY-----';
    const { encrypted, iv, authTag } = encrypt(value);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(value);
  });

  it('handles unicode values', () => {
    const value = 'password_with_emoji_\u{1F511}';
    const { encrypted, iv, authTag } = encrypt(value);
    const decrypted = decrypt(encrypted, iv, authTag);
    expect(decrypted).toBe(value);
  });
});
