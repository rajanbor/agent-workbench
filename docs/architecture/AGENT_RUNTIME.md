# Agent runtime architecture

An `AgentRuntime` starts, observes, stops and resumes a provider-neutral run. Provider adapters implement supported login/API flows and translate streaming output into protocol events. Credentials are referenced through secure storage; passwords are never collected by Open Cube.

Runs emit lifecycle, output, tool-call, approval, cost and terminal events. An orchestrator may delegate only to agents allowed by its `delegationPolicy`. The runtime validates budget and permissions before each tool action.
