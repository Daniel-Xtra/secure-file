# 🔐 Secure File Encryption Service

A **production-grade, fintech-level** file encryption and decryption service built with **NestJS**. Implements **bank-grade security standards**, zero-trust architecture, and enterprise backend engineering practices.

---

## Security Architecture

| Layer             | Technology                                                              |
| ----------------- | ----------------------------------------------------------------------- |
| Encryption        | AES-256-GCM (authenticated encryption)                                  |
| Key Derivation    | PBKDF2-SHA512 (310,000 iterations, NIST SP 800-132)                     |
| Randomness        | Node.js `crypto.randomBytes` (CSPRNG)                                   |
| Auth Tag          | 16-byte GCM tag (tamper detection)                                      |
| Envelope          | Self-contained binary: `VERSION│SALT(32)│IV(12)│AUTHTAG(16)│CIPHERTEXT` |
| Password Delivery | Response header only (`X-Encryption-Password`) — never in body or logs  |
| Rate Limiting     | `@nestjs/throttler` — 20 req/min per IP (configurable)                  |
| HTTP Security     | Helmet (CSP, HSTS, noSniff, frameguard, hidePoweredBy)                  |
| Error Handling    | Global exception filter — zero internal detail leakage                  |
| Audit Logging     | Structured JSON events to stdout (ELK/Datadog-compatible)               |
| Storage           | **Zero disk writes** — Multer in-memory storage throughout              |

---

## Endpoints

### `POST /files/encrypt`

Encrypts any file using AES-256-GCM and returns the encrypted binary.

**Request** (`multipart/form-data`):

- `file` — any file (max 50MB by default)

**Response**:

- Body: encrypted binary (`application/octet-stream`)
- `X-Operation-Id` — unique trace ID
- `X-Encryption-Password` — the decryption password (**store this securely**)
- `X-Original-Filename` — sanitized original filename
- `X-Original-Size-Bytes` — original file size

---

### `POST /files/decrypt`

Decrypts an encrypted file using the password.

**Request** (`multipart/form-data`):

- `file` — the encrypted `.enc` file
- `password` — the encryption password

**Response**:

- Body: original plaintext file (`application/octet-stream`)
- `X-Operation-Id` — unique trace ID
- `X-Decrypted-Size-Bytes` — plaintext size

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd secure-file-service
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env as needed
```

### 3. Run (development)

```bash
npm run start:dev
```

### 4. Run (Docker)

```bash
docker compose up --build
```

---

## API Examples (curl)

### Encrypt a file

```bash
curl -X POST http://localhost:3000/files/encrypt \
  -F "file=@./document.pdf" \
  -o encrypted.enc \
  -D response-headers.txt

# Read the password from headers
grep -i "x-encryption-password" response-headers.txt
```

### Decrypt a file

```bash
curl -X POST http://localhost:3000/files/decrypt \
  -F "file=@./encrypted.enc" \
  -F "password=<PASSWORD_FROM_HEADER>" \
  -o decrypted.pdf
```

### Verify integrity (hashes must match)

```bash
# Windows PowerShell
Get-FileHash document.pdf, decrypted.pdf -Algorithm SHA256

# Linux/macOS
sha256sum document.pdf decrypted.pdf
```

---

## Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# End-to-end tests
npm run test:e2e
```

---

## Folder Structure

```
src/
├── main.ts                          ← Bootstrap (Helmet, pipes, filters)
├── app.module.ts                    ← Root module
├── config/
│   └── configuration.ts            ← Typed config + Joi validation
├── common/
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── interceptors/
│   │   └── audit-log.interceptor.ts
│   └── utils/
│       └── crypto.utils.ts
├── crypto/
│   ├── crypto.module.ts
│   └── crypto.service.ts           ← AES-256-GCM + PBKDF2 engine
├── password/
│   ├── password.module.ts
│   └── password.service.ts         ← Secure password generation + TTL store
├── audit/
│   ├── audit.module.ts
│   └── audit.service.ts            ← Structured audit event logger
└── files/
    ├── files.module.ts
    ├── files.controller.ts          ← POST /files/encrypt, POST /files/decrypt
    ├── files.service.ts
    └── dto/
        └── decrypt-file.dto.ts
```

---

## Security Notes

- **Passwords are never logged.** They are delivered only via `X-Encryption-Password` response header.
- **No file is ever written to disk.** Multer uses in-memory storage.
- **Tamper detection** is built into AES-256-GCM via the authentication tag. Any modification to the encrypted file will cause decryption to fail.
- **Timing-safe comparison** is used in utility functions to prevent oracle attacks.
- **Rate limiting** prevents brute-force password guessing.
- PBKDF2 with 310,000 iterations makes offline dictionary attacks computationally infeasible.

---

## Environment Variables

| Variable             | Default       | Description                                     |
| -------------------- | ------------- | ----------------------------------------------- |
| `PORT`               | `3000`        | Server port                                     |
| `NODE_ENV`           | `development` | Environment (`development`/`production`/`test`) |
| `PBKDF2_ITERATIONS`  | `310000`      | PBKDF2 iteration count (min 100,000)            |
| `SALT_BYTES`         | `32`          | Salt size in bytes                              |
| `IV_BYTES`           | `12`          | GCM IV size (must be 12)                        |
| `KEY_BYTES`          | `32`          | AES key size (must be 32 for AES-256)           |
| `MAX_UPLOAD_SIZE_MB` | `50`          | Max file upload size in MB                      |
| `THROTTLE_TTL_MS`    | `60000`       | Rate limit window in ms                         |
| `THROTTLE_LIMIT`     | `20`          | Max requests per window per IP                  |
| `PASSWORD_EXPIRY_MS` | `300000`      | Password TTL in ms (5 minutes)                  |
| `PASSWORD_BYTES`     | `32`          | Password entropy in bytes                       |
| `ALLOWED_ORIGINS`    | —             | Comma-separated CORS origins (production)       |
