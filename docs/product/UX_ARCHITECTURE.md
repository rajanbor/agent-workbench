# UX architecture

Open Cube follows the information density of a desktop IDE: almost-black surfaces, subtle borders, concise labels and lime used only for active, running and primary actions. Interface text uses a system sans-serif; terminal and IDs use a monospace face.

The UI must show real state. Cards, gradients and oversized hero typography are reserved for onboarding. A running agent shows state (`running`, `waiting`, `idle`, `approval`, `failed`), target machine, sandbox and current task.

Inspector sections are selected-object specific: Agent exposes permissions and budget; Sandbox exposes mounts and isolation; Machine exposes resources and runtimes; Task exposes owner and run history. A panel can be split right/down, moved, closed or maximized without losing its backing session.
