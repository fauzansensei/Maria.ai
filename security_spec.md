# Security Specification for AuraAI Firestore Database

## 1. Data Invariants
- Users can only read and write their own profile at `/users/{userId}` where `userId == request.auth.uid`.
- User profiles cannot self-assign administrative roles or elevate privileges.
- Conversations at `/conversations/{conversationId}` belong strictly to the owner (`resource.data.userId == request.auth.uid`).
- A user can only create a conversation if `request.resource.data.userId == request.auth.uid` and valid document IDs (`isValidId`) are used.
- Messages at `/conversations/{conversationId}/messages/{messageId}` can only be created if the parent conversation belongs to the authenticated user (`get(/databases/$(database)/documents/conversations/$(conversationId)).data.userId == request.auth.uid`).
- Updates to conversations only allow modifying `title`, `updatedAt`, and `mode`. `userId` and `createdAt` are immutable.
- Messages are append-only / immutable once written to preserve conversation integrity.
- Denial of Wallet & Injection guards: String lengths are strictly constrained (messages <= 50,000 chars, title <= 200 chars, ID <= 128 chars).

## 2. Dirty Dozen Security Payloads
1. **Unauthenticated Read User Profile**: Attempting `GET /users/victim123` with `request.auth == null` -> PERMISSION_DENIED
2. **Foreign Profile Read**: User `attacker` attempting `GET /users/victim123` -> PERMISSION_DENIED
3. **Foreign Profile Write**: User `attacker` attempting `SET /users/victim123` -> PERMISSION_DENIED
4. **Self-Escalation Attack**: User attempting `SET /users/attacker` with `{"role": "admin"}` -> PERMISSION_DENIED
5. **ID Poisoning in Conversation Path**: User attempting `GET /conversations/<1.5kb_junk_string>` -> PERMISSION_DENIED
6. **Foreign Conversation Read**: User `attacker` attempting `GET /conversations/conv_victim` where `userId != attacker` -> PERMISSION_DENIED
7. **Identity Spoofing on Conversation Create**: User `attacker` creating conversation with `userId: "victim123"` -> PERMISSION_DENIED
8. **Shadow Field Injection**: User updating conversation with extra field `{"isAdmin": true}` -> PERMISSION_DENIED
9. **Message Creation in Victim's Conversation**: User `attacker` attempting `CREATE /conversations/conv_victim/messages/msg1` -> PERMISSION_DENIED
10. **Oversized Payload Attack**: User attempting `CREATE` message with 2MB string -> PERMISSION_DENIED
11. **Immutability Bypass**: User attempting to change `userId` or `createdAt` on existing conversation -> PERMISSION_DENIED
12. **Blanket Query Scraping**: User querying `/conversations` without filtering by `userId == request.auth.uid` -> PERMISSION_DENIED
