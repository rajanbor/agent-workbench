# ADR 002: provider-neutral agents

## Decision

Represent an agent independently from OpenAI, Anthropic, Gemini, Bedrock or local model integrations. Provider and model are selected capabilities attached to an agent.

## Consequences

The orchestrator is only an agent role. Provider adapters own authentication and streaming translation, and the UI can render one consistent permission and task model.
