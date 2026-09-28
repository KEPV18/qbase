// ============================================================================
// Safe Event Emission Utility
// Replaces silent catch(() => {}) patterns with structured error handling
// ============================================================================

import { log } from '@/services/logger';

/**
 * Safely emit an event, logging any errors without throwing.
 * Use for fire-and-forget event emissions where failure is non-critical.
 * 
 * @param promise - Promise that emits the event
 * @param context - Context string for logging (e.g., 'emitEvent:user.login')
 * @returns Promise that always resolves (never rejects)
 */
export async function safeEmit<T>(
  promise: Promise<T>,
  context: string
): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    // Log but don't throw - event emission failures are non-critical
    log.system.warn('safeEmit:event_emission_failed', {
      context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return undefined;
  }
}

/**
 * Create a safe emit function bound to a specific context.
 * Useful for repeated emissions in the same module.
 * 
 * @param context - Context prefix for logging
 * @returns Function that safely emits promises with the context
 */
export function createSafeEmitter(context: string) {
  return <T,>(promise: Promise<T>): Promise<T | undefined> => 
    safeEmit(promise, context);
}

export { safeEmit as safeEventEmit };