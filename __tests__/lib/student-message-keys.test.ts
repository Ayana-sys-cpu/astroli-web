import { describe, it, expect } from 'vitest';
import { messageKeysFor } from '@/lib/student-message-keys';

const USERS_ID = '2a08107c-3316-4cc3-bff2-7ae0d6a043cc';
const AUTH_UID = 'a03ce316-9b09-422d-8a5e-171fae5d80ad';

describe('messageKeysFor', () => {
  it('returns both users.id and auth_user_id when they differ', () => {
    expect(messageKeysFor({ id: USERS_ID, auth_user_id: AUTH_UID })).toEqual([USERS_ID, AUTH_UID]);
  });

  it('dedupes when users.id and auth_user_id are the same value', () => {
    expect(messageKeysFor({ id: USERS_ID, auth_user_id: USERS_ID })).toEqual([USERS_ID]);
  });

  it('drops a null auth_user_id', () => {
    expect(messageKeysFor({ id: USERS_ID, auth_user_id: null })).toEqual([USERS_ID]);
  });

  it('filters out non-uuid ids — messages.student_id is uuid-typed and a non-uuid key breaks the query', () => {
    expect(messageKeysFor({ id: 'teacher_123', auth_user_id: AUTH_UID })).toEqual([AUTH_UID]);
  });

  it('accepts uppercase uuids', () => {
    expect(messageKeysFor({ id: USERS_ID.toUpperCase(), auth_user_id: null })).toEqual([USERS_ID.toUpperCase()]);
  });

  it('returns an empty list when no key is a valid uuid', () => {
    expect(messageKeysFor({ id: 'not-a-uuid', auth_user_id: null })).toEqual([]);
  });
});
