# AEO Protocol v0.1 — Specification

**Status:** Draft
**Version:** 0.1.0
**Editor:** Miz Causevic
**License:** AGPL-3.0 (this document); schema and examples in this repository are likewise AGPL-3.0. Implementations are unrestricted.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Scope and audience

This specification defines a format and discovery convention for **entity declarations** consumed by **answer engines** — software systems that synthesize natural-language responses across one or more source documents, typically using large language models or hybrid retrieval-and-generation pipelines.

The protocol is **publisher-facing** (a brand, person, product, organization, or place owns its declaration) and **engine-readable** (any answer engine MAY consume the declaration to inform citation, attribution, and synthesis decisions).

The protocol is **not** a crawl-control mechanism, a training-data opt-out, or a sitemap. It does not replace `robots.txt`, `llms.txt`, `ai.txt`, or `sitemap.xml`. It MAY be deployed alongside any combination of them.

## 2. Terminology

- **Entity** — the subject of the declaration. One of: `Person`, `Organization`, `Product`, `Place`, `Concept`.
- **Origin** — the scheme-host-port tuple where the declaration is served.
- **Declaration document** — the JSON document at `/.well-known/aeo.json`.
- **Claim** — a single asserted predicate-value pair about the entity.
- **Citation** — the act of an answer engine reproducing or paraphrasing a claim in a synthesized response.
- **Authority** — the set of primary sources and verification proofs the entity asserts as canonical.
- **Consumer** — any system (answer engine, agent, crawler, validator) reading the declaration.

## 3. The three pillars

### 3.1 Declare

The entity publishes a single JSON document at a fixed path describing itself. The document conforms to the schema in [`aeo.schema.json`](aeo.schema.json). Section 4 describes the document structure.

### 3.2 Discover

A conforming declaration **MUST** be served at:

```
https://<origin>/.well-known/aeo.json
```

The path `/.well-known/aeo.json` follows [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615) (Well-Known URIs).

The response **MUST** use `Content-Type: application/aeo+json`. The response **SHOULD** be served over HTTPS. The response **SHOULD** include a `Cache-Control` header consistent with the entity's expected update cadence; a `max-age` of `3600` is a reasonable default.

A consumer **MAY** follow a single 301/302 redirect from `/.well-known/aeo.json` to a canonical location on the same origin. A consumer **MUST NOT** follow cross-origin redirects.

If the document references claims about subdomains or related origins, those origins **SHOULD** serve their own declaration or a redirect to the canonical one.

### 3.3 Audit

A declaration **MAY** include an optional `audit` block describing how consumers can confirm that a given answer used the declaration correctly. Three audit modes are defined; consumers select the strongest one supported by both parties.

| Mode | Mechanism | Conformance level |
|---|---|---|
| `none` | No audit surface; declaration is take-it-or-leave-it. | Level 1 |
| `signature` | The declaration is signed with a JWK referenced from the document; consumers verify integrity and origin. | Level 2 |
| `endpoint` | The publisher exposes a POST endpoint; consumers post back the claim IDs they cited along with the answer hash. | Level 3 |

## 4. Document structure

The top-level object has the following members. Members marked **required** **MUST** be present in any conforming document.

### 4.1 `aeo_version` (required)

A semver string identifying the protocol version. For this specification, the value **MUST** be `"0.1"`.

### 4.2 `entity` (required)

Identifies the subject of the declaration.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | URI | yes | Stable canonical identifier. SHOULD be dereferenceable. |
| `type` | enum | yes | One of `Person`, `Organization`, `Product`, `Place`, `Concept`. |
| `name` | string | yes | Primary display name. |
| `aliases` | array of string | no | Alternative names, prior names, transliterations. |
| `canonical_url` | URI | yes | The single URL the entity prefers as its canonical web presence. |

### 4.3 `authority` (required)

Describes what the entity considers authoritative about itself.

| Field | Type | Required | Description |
|---|---|---|---|
| `primary_sources` | array of URI | yes | Ordered list of canonical sources. Earlier sources outrank later ones. |
| `evidence_links` | array of URI | no | Secondary sources that corroborate but are not canonical. |
| `verifications` | array of object | no | Proofs of control (DNS, GitHub, LinkedIn, etc.). See §4.3.1. |

#### 4.3.1 Verification object

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | enum | yes | One of `domain`, `dns`, `github`, `linkedin`, `gpg`, `well-known-uri`. |
| `value` | string | yes | The identifier proved (domain name, handle, fingerprint). |
| `proof_uri` | URI | no | Where the proof artifact lives (e.g. a TXT record location, a Gist). |

### 4.4 `claims` (required)

An array of asserted facts about the entity. **MUST** contain at least one claim.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Local identifier unique within this document. Lowercase, kebab-case. |
| `predicate` | string | yes | A Schema.org property name, OR an AEO-namespaced predicate (see §4.4.1). |
| `value` | any | yes | The asserted value. May be primitive, array, or nested object. |
| `evidence` | array of URI | no | Sources backing the claim. Defaults to `authority.primary_sources`. |
| `valid_from` | date | no | ISO-8601 date the claim became true. |
| `valid_until` | date or null | no | ISO-8601 date the claim ceases to be true; `null` indicates ongoing. |
| `confidence` | enum | no | `high` / `medium` / `low`. Defaults to `high`. |

#### 4.4.1 AEO-namespaced predicates

When a Schema.org predicate is unavailable, the document **MAY** use an AEO-namespaced predicate of the form `aeo:<name>`. The initial namespace includes:

- `aeo:yearsOfExperience`
- `aeo:authoredSpecification`
- `aeo:operates` (live products / services)
- `aeo:targetEcosystem`
- `aeo:primaryLanguageStack`

Implementations **MAY** propose additions via pull request to this repository.

### 4.5 `citation_preferences` (optional)

Tells an answer engine how to cite the entity when including its claims.

| Field | Type | Description |
|---|---|---|
| `preferred_attribution` | string | A short attribution template. May include `{name}`, `{canonical_url}`, `{role}`. |
| `canonical_links` | array of URI | Links the engine SHOULD include when surfacing claims. |
| `do_not_cite` | array of URI | Sources known to be stale, incorrect, or outdated. Engines SHOULD NOT cite these. |

### 4.6 `answer_constraints` (optional)

Soft constraints an answer engine SHOULD honor when synthesizing.

| Field | Type | Description |
|---|---|---|
| `must_include` | array of string | Claim IDs that SHOULD appear in any answer touching this entity. |
| `must_not_include` | array of string | Claim IDs OR topic tags (prefixed `topic:`) that SHOULD NOT appear. |
| `freshness_window_days` | integer | Maximum age in days for the engine's underlying data; older data SHOULD trigger a re-fetch of this declaration. |

Constraints are **soft**: the protocol does not bind engine behavior. They communicate publisher intent for engines that choose to honor it.

### 4.7 `audit` (optional)

Conformance Level 2+ adds an `audit` object:

| Field | Type | Description |
|---|---|---|
| `mode` | enum | `none`, `signature`, or `endpoint`. |
| `signing_key_uri` | URI | (signature mode) Location of the JWK or JWKS used to sign the document. |
| `signature` | string | (signature mode) Detached JWS over the canonical JSON form of the rest of the document. |
| `endpoint_uri` | URI | (endpoint mode) HTTPS POST endpoint accepting audit reports. |
| `endpoint_schema` | URI | (endpoint mode) JSON Schema describing the audit report payload. |

## 5. Conformance levels

| Level | Requirements |
|---|---|
| **Level 1 — Declare** | Document published at `/.well-known/aeo.json`, schema-valid, has at least one claim. |
| **Level 2 — Verify** | Level 1, plus at least one `authority.verifications` entry **and** `audit.mode` set to `signature` with a valid detached JWS. |
| **Level 3 — Audit** | Level 2, plus a working `audit.endpoint_uri` returning HTTP 2xx for valid audit reports. |

Consumers **SHOULD** advertise the highest level they enforce and treat lower-level declarations accordingly.

## 6. Security and privacy considerations

- **Spoofing.** A Level 1 declaration is unsigned and can be served by anyone who controls the origin. Consumers relying on entity identity for high-stakes synthesis **SHOULD** require Level 2.
- **PII surface.** Publishers control what they declare. The protocol does not enable any disclosure the entity did not already publish; it only structures it. Publishers **SHOULD NOT** include data they would not be comfortable seeing reproduced in a synthesized answer.
- **Stale claims.** `valid_until` and `freshness_window_days` are advisory. Consumers **SHOULD** re-fetch on every synthesis pass where the entity is material; aggressive caching defeats freshness signals.
- **Cross-origin claims.** A declaration on origin A **MUST NOT** be treated as authoritative for claims about origin B unless B serves its own declaration that references A as a primary source.
- **Audit feedback as side channel.** The endpoint mode opens an inbound surface. Implementers **MUST** rate-limit and authenticate audit endpoints; the protocol does not mandate a specific auth scheme but RECOMMENDS HTTP signatures or mutual TLS for production deployments.

## 7. Relationship to existing standards

| Standard | Relationship to AEO |
|---|---|
| **JSON-LD / Schema.org** | AEO uses Schema.org predicates by reference. Schema.org provides vocabulary; AEO provides citation, freshness, and audit semantics. |
| **`robots.txt`** | Orthogonal. `robots.txt` controls crawl access; AEO controls synthesis-time citation. |
| **`llms.txt`** | Complementary. `llms.txt` curates *what to read*; AEO declares *what is authoritative and how to cite it*. |
| **`ai.txt`** | Complementary. `ai.txt` is training-data opt-out; AEO is inference-time declaration. |
| **`sitemap.xml`** | Orthogonal. Sitemaps enumerate pages; AEO declares facts about the entity behind those pages. |
| **DID / Verifiable Credentials** | Inspirational but heavier. AEO is intentionally a flat JSON document with a single well-known URL — designed for adoption, not for cryptographic completeness. |

## 8. Open questions

Issues welcome. Top open questions for v0.2:

- **Bulk declarations.** Should an origin serving many entities (e.g. an employee directory) use one document or many?
- **Predicate registry.** Where should new `aeo:`-namespaced predicates be ratified?
- **Verification scheme for non-domain entities.** A person without a domain still needs verification; GitHub / LinkedIn proofs are placeholders.
- **Internationalization.** Names, aliases, claim values — needs explicit `lang` tagging or per-locale fallbacks.
- **Versioning of claims over time.** Should each claim carry a hash, allowing engines to detect what changed since their last read?

## 9. References

- RFC 2119 — Key words for use in RFCs to indicate requirement levels
- RFC 8615 — Well-Known URIs
- Schema.org — https://schema.org/
- llms.txt — https://llmstxt.org/
- W3C Decentralized Identifiers (DID) — https://www.w3.org/TR/did-core/
- JSON Schema 2020-12 — https://json-schema.org/draft/2020-12/release-notes
