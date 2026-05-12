# AEO Protocol

A draft specification for making entity declarations **machine-readable, discoverable, and auditable** by answer engines.

The SEO era assumed humans typed queries into a search box and clicked blue links. The answer-engine era assumes an LLM composes a synthesized response in which a brand, person, product, or place may be cited, paraphrased, or omitted. AEO is the layer that lets an entity declare *what is authoritative about it*, *where to find that declaration*, and *how to verify it was used correctly*.

This repo is the v0.1 draft of the protocol, the JSON Schema that validates a conforming document, and three reference examples.

## The three pillars

| Pillar | What it does | File on your origin |
|---|---|---|
| **Declare** | One JSON document describing the entity, its authoritative claims, and citation preferences | `/.well-known/aeo.json` |
| **Discover** | A fixed well-known URL so any answer engine can find the declaration without bespoke crawling | Same path on every origin |
| **Audit** | A signed or queryable surface that lets a publisher verify which claims were cited in a given answer | Optional endpoint in the document |

## Why not just JSON-LD / Schema.org?

Schema.org tells an answer engine *what is true about this page*. It does not tell the engine:

- **Which sources are canonical vs. stale** for a given entity
- **How the publisher wants to be attributed**
- **What freshness window applies to each claim**
- **Which claims must / must not appear in a synthesized answer**
- **How to verify the publisher endorsed the declaration**

AEO is built on top of JSON-LD vocabulary where useful (`schema.org` predicates are first-class), but it adds the **citation, freshness, and audit** semantics that synthesized-answer surfaces actually need.

## Why not llms.txt / ai.txt / robots.txt?

- **`robots.txt`** controls *crawling*. AEO controls *citation and synthesis*.
- **`llms.txt`** ([answer.ai proposal](https://llmstxt.org/)) tells an LLM *what content to read*. AEO tells it *what to consider authoritative and how to cite it*.
- **`ai.txt`** ([Spawning proposal](https://site.spawning.ai/spawning-ai-txt)) is opt-out signaling for training data. AEO is opt-in declaration for inference-time citation.

AEO is complementary to all three. A publisher should serve `robots.txt`, optionally serve `llms.txt`, and additionally serve `/.well-known/aeo.json` for citation-grade declarations.

## Quickstart

1. Write an `aeo.json` document conforming to [`aeo.schema.json`](aeo.schema.json). Start from one of the [examples](examples/).
2. Validate it with any JSON Schema 2020-12 validator (e.g. `ajv`, `jsonschema`).
3. Serve it at `https://your-origin/.well-known/aeo.json` with `Content-Type: application/aeo+json`.
4. (Optional, conformance Level 2+) Add a verification record — a DNS TXT entry or signed JWK — referenced from the document.
5. (Optional, conformance Level 3) Expose an audit endpoint so consumers can post back which claims they cited.

## Files in this repo

- [`SPEC.md`](SPEC.md) — full v0.1 specification
- [`aeo.schema.json`](aeo.schema.json) — JSON Schema (draft 2020-12) for validation
- [`examples/aeo-person.json`](examples/aeo-person.json) — reference document for a Person entity
- [`examples/aeo-organization.json`](examples/aeo-organization.json) — reference document for an Organization entity
- [`examples/aeo-product.json`](examples/aeo-product.json) — reference document for a Product entity

## Status

**v0.1 draft.** Not ratified by any standards body. Authored as an opinionated starting point for the post-search era. Issues and pull requests welcome; substantive proposals should reference the conformance level they affect.

## License

AGPL-3.0. The specification text itself is freely implementable; this license applies to the schema and example documents as distributed in this repository.

## Working interest

This protocol is part of a wider platform-engineering effort to give brands, products, and people first-class standing in the answer-engine era. Related work lives under the same author: [github.com/mizcausevic-dev](https://github.com/mizcausevic-dev).
