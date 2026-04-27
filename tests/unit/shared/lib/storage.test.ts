import { isStorageConfigured, buildInlineDataUrl } from '@/shared/lib/storage';

jest.mock('@/config/env', () => ({
  env: {
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY: '',
    R2_SECRET_KEY: '',
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_URL: 'https://cdn.example.com',
  },
}));

describe('storage', () => {
  describe('isStorageConfigured', () => {
    it('returns false when R2 env vars are empty', () => {
      expect(isStorageConfigured()).toBe(false);
    });
  });

  describe('buildInlineDataUrl', () => {
    it('builds a data URL from base64 data', () => {
      const result = buildInlineDataUrl('user123', 'screenshot.png', 'aGVsbG8=', 'image/png');
      expect(result.publicUrl).toBe('data:image/png;base64,aGVsbG8=');
      expect(result.fileKey).toMatch(/^inline\/user123\/.+-screenshot\.png$/);
    });

    it('uses default content type when not specified', () => {
      const result = buildInlineDataUrl('user123', 'file.bin', 'ZGF0YQ==');
      expect(result.publicUrl).toBe('data:application/octet-stream;base64,ZGF0YQ==');
    });

    it('preserves original filename in fileKey', () => {
      const result = buildInlineDataUrl('user123', 'my file (2).png', 'abc');
      expect(result.fileKey).toContain('inline/user123/');
      expect(result.fileKey).toContain('my file (2).png');
    });
  });
});
