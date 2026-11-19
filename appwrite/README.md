# Appwrite Configuration and Functions

This directory holds the Appwrite server-side components, Function code, and configurations for CVMatch AI.

## Structure

- `appwrite.config.json` — Configuration for Appwrite resources (Functions, collections, storage).
- `functions/analyze-cv/` — The primary Python backend function coordinating document validation, text extraction, Google Gemini AI analysis, deterministic scoring, and persistence.

See [docs/function-deployment.md](../../docs/function-deployment.md) for full deployment instructions.
