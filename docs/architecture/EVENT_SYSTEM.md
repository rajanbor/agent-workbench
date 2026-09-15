# Event system

`workbenchd` is the event authority. Events have IDs, an object ID, timestamp, sequence number, type, payload version and correlation ID. Clients keep a cursor and recover via snapshot plus replay.

Core event families: `machine.*`, `sandbox.*`, `agent.*`, `task.*`, `run.*`, `terminal.*`, `provider.*`, `approval.*` and `layout.*`. UI clients render events optimistically only when the command has an idempotency key.
