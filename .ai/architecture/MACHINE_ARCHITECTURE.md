# Machine architecture

A machine runs `workbenchd` and publishes signed capability snapshots: OS, CPU, RAM, GPU, installed models, runtimes, sandbox capacity and active load. The local machine uses the same protocol as paired remote machines.

Device pairing is optional and explicit. Transport must authenticate peers and encrypt traffic. Scheduling chooses Auto or an explicit machine; it cannot silently move a run to a remote host.
