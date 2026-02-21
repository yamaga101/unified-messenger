/**
 * OAuth helper wrapping chrome.identity APIs.
 */

export async function getGoogleAuthToken(
  interactive: boolean = true,
): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive });
  if (!result.token) {
    throw new Error("Failed to get auth token");
  }
  return result.token;
}

export async function revokeGoogleAuthToken(token: string): Promise<void> {
  await chrome.identity.removeCachedAuthToken({ token });
}

/**
 * Launch web auth flow for services that need external OAuth (Teams, Slack).
 */
export async function launchWebAuthFlow(
  authUrl: string,
): Promise<string> {
  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });
  if (!redirectUrl) {
    throw new Error("No redirect URL received");
  }
  return redirectUrl;
}
