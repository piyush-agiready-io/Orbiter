import { parseIdToken } from '@/modules/ai/openai-oauth';

describe('OpenAI OAuth utilities', () => {
  describe('parseIdToken', () => {
    it('extracts email and account info from JWT claims', () => {
      const payload = {
        email: 'user@example.com',
        chatgpt_account_id: 'acct_123',
        chatgpt_plan_type: 'plus',
      };
      const fakeJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fakesig`;
      const result = parseIdToken(fakeJwt);
      expect(result.email).toBe('user@example.com');
      expect(result.accountId).toBe('acct_123');
      expect(result.planType).toBe('plus');
    });

    it('returns undefined fields when claims are missing', () => {
      const payload = {};
      const fakeJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fakesig`;
      const result = parseIdToken(fakeJwt);
      expect(result.email).toBeUndefined();
      expect(result.accountId).toBeUndefined();
      expect(result.planType).toBeUndefined();
    });
  });
});
