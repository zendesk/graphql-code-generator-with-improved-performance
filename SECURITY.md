# AI Agent Security Standard

This document defines mandatory security principles and restrictions for all AI coding assistants operating in this repository. All AI agents must follow these requirements without exception.

**Authority:** Derived from [Zendesk Minimum Baseline Security Standard](https://docs.google.com/document/d/17GZ9TpjKCt6WCdw3yxL44Ra_YscbOBVnVkUVGgx5Hz0/) and internal security policies.

---

## Core Security Mandate

Security is a first-class requirement. Every code suggestion must be evaluated against these guidelines. If a request would result in insecure code:

1. **Stop** and flag the security concern
2. **Explain** why it's problematic
3. **Propose** a secure alternative

AI-generated code requires human review before merging.

---

## Absolute Prohibitions

AI agents must **NEVER** do the following:

### Secrets & Credentials
- Hardcode secrets, credentials, API keys, tokens, or passwords in source code
- Store secrets in version control (`.env` files, config with real values)
- Log, print, or expose secret values
- Expose credentials in URLs, logs, or error messages

### Security Controls
- Disable or weaken security controls (`verify=False`, `ALLOW_ALL` CORS, disabled auth)
- Bypass authentication or authorization checks
- Disable certificate validation or TLS verification when loading remote schemas
- Weaken password policies or MFA requirements

### Dangerous Code Patterns
- Use `eval()` or `exec()` with user-supplied input
- Implement custom cryptography
- Use deprecated algorithms (MD5, SHA-1 for security, DES, RC4, ECB mode)
- Introduce shell-injection vectors in config or plugin hooks (e.g., unsanitized `afterAllFileWrite` commands)

### Data Exposure
- Log sensitive data (PII, credentials, tokens, customer data)
- Expose stack traces or internal paths to end users in generated output
- Transmit sensitive data over unencrypted channels

---

## Required Security Patterns

### Secret Management

```typescript
// Correct: Environment variable
const apiKey = process.env.MY_SERVICE_API_KEY;
```

```typescript
// NEVER: Hardcoded secret
const apiKey = "sk-abc123XYZ";
```

### Schema Loading — Remote URLs
When loading schemas over HTTPS (`@graphql-tools/url-loader`), never disable certificate validation:

```typescript
// Correct: let the loader use default TLS validation
const schema = await loadSchema('https://api.example.com/graphql', { loaders });
```

```typescript
// NEVER: disable TLS
const schema = await loadSchema(url, { loaders, fetchOptions: { agent: insecureAgent } });
```

### Plugin Lifecycle Hooks — Shell Commands
The `afterAllFileWrite`, `beforeAllFileWrite`, and similar hooks execute shell commands. Never construct hook commands from untrusted input:

```typescript
// Correct: static hook command from config
hooks: { afterAllFileWrite: ['prettier --write'] }
```

```typescript
// NEVER: user-controlled input in hook command
hooks: { afterAllFileWrite: [`${userInput} --write`] }
```

### Logging

```typescript
// Correct: structured logging without secrets
debugLog(`Generated ${filename}`);
```

```typescript
// NEVER: logging sensitive data
debugLog(`Token: ${process.env.AUTH_TOKEN}`);
```

---

## Security Requirements by Domain

### Input Validation
- Validate plugin config using the `validate` export of `CodegenPlugin` — throw descriptive errors for invalid config rather than proceeding silently
- Validate schema pointers and document paths before loading; reject unexpected protocols if your use case doesn't require them

### Data Protection
- Generated output files must not embed environment variable values or secrets, even as examples
- When generating example/fixture files, use placeholder values (e.g., `"<YOUR_API_KEY>"`) not real-looking secrets
- Classify schema content as potentially confidential — do not log full schema SDL in production output

### Cryptography
| Use Case | Approved | Forbidden |
|----------|----------|-----------|
| Content hashing (cache keys, change detection) | SHA-256 (`crypto.createHash('sha256')`) | MD5, SHA-1 |
| File content change detection | SHA-1 acceptable for non-security use (already used in `generate-and-save.ts`) | — |
| Password / token hashing | bcrypt, Argon2, PBKDF2 | MD5, SHA-1, unsalted |
| TLS | TLS 1.2+ | SSLv2/3, TLS 1.0/1.1 |

### Communication Security
- Use HTTPS for all remote schema/document endpoints — no HTTP fallback
- Never disable certificate validation in loader options
- Apply timeouts and rate limits when loading remote schemas in production contexts

### Error Handling
- Handle errors gracefully — no sensitive internal paths or tokens in user-facing error messages
- Log security-relevant events (e.g., failed schema loads, validation errors) to stderr, not stdout (which may be piped to files)

---

## When to Stop and Escalate

Stop, explain the concern, and recommend involving Security if a task requires:

- Bypassing or weakening security controls
- Disabling certificate validation or TLS verification
- Constructing shell commands from untrusted/user-supplied input
- Embedding secrets or real credentials in any file tracked by git
- Accessing production schemas or data without authorization
- Using deprecated protocols or cryptographic algorithms
- Any change that could cause generated output to exfiltrate data

---

## Security Testing

When generating features or changes, include:

- Unit tests for config validation logic (`validate` export of plugins)
- Tests for error cases: invalid schema pointers, missing required config, unauthorized access
- Negative test cases for boundary conditions and error paths
- Ensure test fixtures do not contain real credentials or sensitive data

---

## References

- [Minimum Baseline Security Standard](https://docs.google.com/document/d/17GZ9TpjKCt6WCdw3yxL44Ra_YscbOBVnVkUVGgx5Hz0/)
- [Cryptography Standards](https://techmenu.zende.sk/standards/cryptography-standards/)
- [Unified JWT Standard](https://techmenu.zende.sk/standards/unified-jwt/)

---

**Questions?** Reach out to the Security team or file a ticket via the Security Engagement process.
