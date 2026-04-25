jest.mock('@/config/env', () => ({
  env: {
    ENCRYPTION_KEY: 'a'.repeat(64),
  },
}));

import { encrypt, decrypt } from '@/shared/lib/encryption';

describe('encryption', () => {
  describe('encrypt', () => {
    it('returns encrypted data with iv and authTag', () => {
      const result = encrypt('my-secret-value');
      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result.encrypted).not.toBe('my-secret-value');
      expect(result.iv).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(result.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('produces different ciphertext for same plaintext', () => {
      const r1 = encrypt('same-value');
      const r2 = encrypt('same-value');
      expect(r1.encrypted).not.toBe(r2.encrypted);
      expect(r1.iv).not.toBe(r2.iv);
    });
  });

  describe('decrypt', () => {
    it('decrypts back to original plaintext', () => {
      const { encrypted, iv, authTag } = encrypt('hello-world');
      const result = decrypt(encrypted, iv, authTag);
      expect(result).toBe('hello-world');
    });

    it('decrypts empty string', () => {
      const { encrypted, iv, authTag } = encrypt('');
      const result = decrypt(encrypted, iv, authTag);
      expect(result).toBe('');
    });

    it('decrypts special characters', () => {
      const value = 'pk_live_abc123!@#$%^&*()';
      const { encrypted, iv, authTag } = encrypt(value);
      expect(decrypt(encrypted, iv, authTag)).toBe(value);
    });

    it('throws on tampered ciphertext', () => {
      const { encrypted, iv, authTag } = encrypt('secret');
      const tampered = 'ff' + encrypted.slice(2);
      expect(() => decrypt(tampered, iv, authTag)).toThrow();
    });

    it('throws on wrong authTag', () => {
      const { encrypted, iv } = encrypt('secret');
      const wrongTag = 'b'.repeat(32);
      expect(() => decrypt(encrypted, iv, wrongTag)).toThrow();
    });
  });
});
