/**
 * Test utility for KakaoTalk authentication implementation
 * This file can be used to test the two-step authentication approach
 */

import { FirebaseAuthService } from '../services/auth-service';

/**
 * Test the KakaoTalk authentication with two-step approach
 */
export async function testKakaoAuth() {
  const authService = new FirebaseAuthService();

  try {
    console.log('=== TESTING KAKAOTALK AUTHENTICATION ===');
    console.log('Attempting KakaoTalk sign-in with two-step approach...');

    const result = await authService.signInWithKakao();

    console.log('=== KAKAOTALK AUTHENTICATION SUCCESS ===');
    console.log('Authentication result:', {
      userUid: result.user.uid,
      isAnonymous: result.user.isAnonymous,
      providerData: result.user.providerData,
      displayName: result.user.displayName,
      email: result.user.email,
      isNewUser: (result as any).additionalUserInfo?.isNewUser,
      providerId: (result as any).additionalUserInfo?.providerId,
    });

    return result;
  } catch (error) {
    console.error('=== KAKAOTALK AUTHENTICATION FAILED ===');
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Test the user creation error detection logic
 */
export function testUserCreationErrorDetection() {
  const authService = new FirebaseAuthService();

  // Test cases for user creation error detection
  const testCases = [
    {
      name: 'Internal error',
      error: { code: 'auth/internal-error', message: 'Something went wrong' },
      expected: true,
    },
    {
      name: 'Operation not allowed',
      error: { code: 'auth/operation-not-allowed', message: 'Operation not allowed' },
      expected: true,
    },
    {
      name: 'User creation message',
      error: { code: 'auth/some-error', message: 'User creation failed' },
      expected: true,
    },
    {
      name: 'Sign up error',
      error: { code: 'auth/some-error', message: 'Sign up failed' },
      expected: true,
    },
    {
      name: 'Popup closed',
      error: { code: 'auth/popup-closed-by-user', message: 'Popup closed' },
      expected: false,
    },
    {
      name: 'Valid error',
      error: { code: 'auth/invalid-credential', message: 'Invalid credential' },
      expected: false,
    },
  ];

  console.log('=== TESTING USER CREATION ERROR DETECTION ===');

  // Note: Since isKakaoUserCreationError is private, we can't test it directly
  // This would need to be tested through the actual signInWithKakao method
  // or by making the method public for testing purposes

  testCases.forEach((testCase) => {
    console.log(`Test case: ${testCase.name}`);
    console.log(`Expected: ${testCase.expected}`);
    console.log(`Error:`, testCase.error);
    console.log('---');
  });
}

// Export for use in other files
export { FirebaseAuthService };
