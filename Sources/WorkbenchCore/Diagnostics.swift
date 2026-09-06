import Foundation
public enum Diagnostics {
    public static let installation = """
    Run these commands ONLY after logging in as agent (sudo -iu agent):
    mkdir -p "$HOME/.local/npm"
    npm config set prefix "$HOME/.local/npm"
    export PATH="$HOME/.local/node/bin:$HOME/.local/npm/bin:$HOME/.local/bin:$PATH"
    npm install -g @openai/codex @anthropic-ai/claude-code
    Add the export line to agent's ~/.zprofile yourself.
    Git: install Apple Command Line Tools on the Mac: xcode-select --install
    Node/npm: install a Node LTS distribution in agent's own home (see nodejs.org).
    Python: use an agent-local installation (see python.org).
    zsh: /bin/zsh is provided by macOS.
    Never run sudo npm -g or copy the main account's credentials.
    """
    public static func report(_ config: Configuration) -> String {
        var lines = ["Workspace: \(config.workspaceRoot)"]
        do {
            let identity = try AgentIdentity.inspect(config.agentUser)
            lines.append("Agent: agent (UID \(identity.uid)); Admin group: No")
            let root = try WorkspaceValidation.canonical(config.workspaceRoot)
            lines.append(root == config.workspaceRoot ? "Workspace: exists" : "WARNING: workspace is a symlink")
            let mainHome = FileManager.default.homeDirectoryForCurrentUser.path
            let script = """
            for tool in zsh git node npm codex claude python3; do
              if command -v "$tool" >/dev/null 2>&1; then printf '%s: installed (%s)\\n' "$tool" "$(command -v "$tool")"; else printf '%s: missing\\n' "$tool"; fi
            done
            for p in \(Shell.quote(mainHome)) \(Shell.quote(mainHome + "/.ssh")) \(Shell.quote(mainHome + "/.aws")) \(Shell.quote(mainHome + "/.config")) \(Shell.quote(mainHome + "/Documents")) \(Shell.quote(mainHome + "/Library/Mobile Documents")) \(Shell.quote(mainHome + "/Library/Keychains")); do
              if test -r "$p" || test -x "$p"; then printf 'WARNING: agent has access to %s\\n' "$p"; else printf 'Not accessible: %s\\n' "$p"; fi
            done
            for p in /var/run/docker.sock \(Shell.quote(mainHome + "/.docker/run/docker.sock")); do
              if test -w "$p"; then printf 'WARNING: Docker socket accessible: %s\\n' "$p"; fi
            done
            if test -w \(Shell.quote(root)) && test -x \(Shell.quote(root)); then echo 'Workspace writable: Yes'; else echo 'WARNING: workspace is not writable by agent'; fi
            """
            let result = try ProcessRunner.run("/usr/bin/sudo", ["-n", "-iu", "agent", "/usr/bin/env", "-i", "HOME=\(identity.home)", "USER=agent", "LOGNAME=agent", "PATH=\(identity.home)/.local/node/bin:\(identity.home)/.local/npm/bin:\(identity.home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "/bin/zsh", "-lc", script])
            if result.status == 0 { lines.append(result.output) }
            else { lines.append("Tools / home access / Docker access: Unknown — authentication required. Run sudo -v in your terminal, then agentctl status. GUI may have a separate sudo authentication context.") }
        } catch { lines.append("WARNING: \(error.localizedDescription)") }
        lines.append("Sudo policies, TCC, network and all readable files are not exhaustively audited. Profiles are informational.")
        return lines.joined(separator: "\n")
    }
}
