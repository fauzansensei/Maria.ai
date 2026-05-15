# Security Specification for Maria AI

## 1. Data Invariants
- A `Chat` session must belong to the authenticated user.
- A `Message` must belong to a `Chat` session that the user owns.
- `Reminders` and `Notifications` must be private to the user who created/received them.
- User profile data (PII like email) must only be readable by the owner.

## 2. The "Dirty Dozen" Payloads
1. Attempting to create a chat session for a different `userId`.
2. Attempting to update the `userId` of an existing chat session.
3. Attempting to read messages of a chat session owned by someone else.
4. Attempting to inject 1MB string into a reminder title.
5. Attempting to update a message content (messages should be immutable or strictly controlled).
6. Attempting to set `isPlus: true` in user profile (privilege escalation).
7. Attempting to list all users' profiles.
8. Attempting to delete a notification that belongs to another user.
9. Attempting to create a message in a non-existent chat session.
10. Attempting to update `joinedDate` (should be immutable).
11. Attempting to list reminders without filtering by `userId`.
12. Attempting to update a chat's `updatedAt` with a client-side timestamp (non-server).

## 3. The Test Runner
(I will skip creating the .test.ts file for now and focus on the rules logic themselves, as I can't run the firebase emulator here, but I will simulate the logic in my head and via the rules structure).
