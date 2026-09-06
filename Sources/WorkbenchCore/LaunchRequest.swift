import Foundation
import Darwin

/// Main-owned launch data. Agent-writable session status is never used as launch authority.
public struct LaunchRequest: Codable, Sendable {
    public let project: Project
    public let configuration: Configuration
    public let action: String
    public let mainUID: uid_t
    public let mainHome: String
    public let session: String

    public static func save(_ request: LaunchRequest, id: String) throws {
        try Sessions.validateRuntime()
        let directory = Sessions.runtime + "/requests"
        if !FileManager.default.fileExists(atPath: directory) {
            try FileManager.default.createDirectory(atPath: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o755])
        }
        try trusted(directory, owner: getuid())
        guard UUID(uuidString: id) != nil else { throw WorkbenchError.invalid("Invalid session ID") }
        let url = URL(fileURLWithPath: directory + "/" + id + ".json")
        guard !FileManager.default.fileExists(atPath: url.path) else { throw WorkbenchError.invalid("Launch request already exists") }
        try JSONEncoder().encode(request).write(to: url, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o644], ofItemAtPath: url.path)
    }
    private static func trusted(_ path: String, owner: uid_t) throws {
        var info = stat()
        guard lstat(path, &info) == 0, info.st_uid == owner, info.st_mode & 0o022 == 0, info.st_mode & S_IFMT != S_IFLNK else {
            throw WorkbenchError.invalid("Unsafe launch request: \(path)")
        }
        let mode = try ProcessRunner.checked("/bin/ls", ["-lde", path]).split(separator: " ").first ?? ""
        guard !mode.contains("+") else { throw WorkbenchError.invalid("Launch request must not have extended ACLs") }
    }
    public static func load(_ path: String) throws -> LaunchRequest {
        let request = try JSONDecoder().decode(Self.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
        let runtime = "/Users/Shared/AgentWorkbench-\(request.mainUID)"
        let id = URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent
        guard request.mainUID != 0, UUID(uuidString: id) != nil,
              path == runtime + "/requests/" + id + ".json",
              request.session == runtime + "/sessions/" + id else { throw WorkbenchError.invalid("Invalid launch request location") }
        for item in [runtime, runtime + "/requests", path, runtime + "/agentctl"] { try trusted(item, owner: request.mainUID) }
        return request
    }
    public static func start(id: String) throws {
        guard UUID(uuidString: id) != nil else { throw WorkbenchError.invalid("Invalid session ID") }
        let path = Sessions.runtime + "/requests/" + id + ".json"
        let request = try load(path)
        guard request.mainUID == getuid() else { throw WorkbenchError.invalid("Launch from your main account") }
        let identity = try AgentIdentity.inspect("agent")
        print("\nAgent Workbench · \(request.action.capitalized)")
        print("Project: \(request.project.name)\nAccount: agent (UID \(identity.uid))\n")
        print("macOS may ask for your login password to switch accounts.")
        print("The password goes to sudo; the agent receives no administrator privileges.\n")
        fflush(stdout)
        let helper = Sessions.runtime + "/agentctl"
        let command = [helper, "__run", path].map(Shell.quote).joined(separator: " ")
        let arguments = ["-p", "Agent Workbench — password for %u: ", "-iu", "agent", "/usr/bin/env", "-i", "HOME=\(identity.home)", "USER=agent", "LOGNAME=agent", "SHELL=/bin/zsh", "TERM=xterm-256color", "PATH=\(identity.home)/.local/node/bin:\(identity.home)/.local/npm/bin:\(identity.home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "/bin/zsh", "-lc", "exec " + command]
        let status = try ProcessRunner.interactive("/usr/bin/sudo", arguments)
        if status != 0 {
            let existing = (try? String(contentsOfFile: request.session + "/state", encoding: .utf8)) ?? ""
            if !existing.hasPrefix("Failed:") { request.publish("Failed: Account switch or startup failed (code \(status)). See the terminal message above.") }
            throw WorkbenchError.invalid("Session did not start successfully. The reason is shown above and in the app.")
        }
    }
    public func publish(_ state: String) { try? state.write(toFile: session + "/state", atomically: true, encoding: .utf8) }
    public func runAsAgent() throws {
        do {
            let identity = try AgentIdentity.inspect(configuration.agentUser, allowCurrentAgent: true)
            guard getuid() == identity.uid, getuid() != mainUID else { throw WorkbenchError.invalid("Agent UID required") }
            _ = try WorkspaceValidation.project(project.path, root: configuration.workspaceRoot)
            try WorkspaceValidation.environment(project.environment)
            let protected = ["/.ssh", "/.aws", "/.config", "/Documents", "/Library/Mobile Documents", "/Library/Keychains"]
            let accessible = protected.map { mainHome + $0 }.filter { access($0, R_OK) == 0 || access($0, X_OK) == 0 }
            guard accessible.isEmpty else {
                throw WorkbenchError.invalid("Launch blocked: agent can access private directories:\n" + accessible.joined(separator: "\n") + "\nReview their macOS permissions before retrying. No agent was started.")
            }
            for socket in ["/var/run/docker.sock", mainHome + "/.docker/run/docker.sock"] where access(socket, W_OK) == 0 {
                throw WorkbenchError.invalid("Launch blocked: agent can access Docker socket \(socket)")
            }
            guard let action = LaunchAction(rawValue: action) else { throw WorkbenchError.invalid("Unknown agent") }
            for (key, value) in project.environment { setenv(key, value, 1) }
            setenv("GIT_CONFIG_COUNT", "1", 1); setenv("GIT_CONFIG_KEY_0", "safe.directory", 1); setenv("GIT_CONFIG_VALUE_0", project.path, 1)
            print("Account verified: agent · UID \(getuid())\nWorkspace: \(project.path)\n")
            fflush(stdout)
            try ProcessRunner.supervise(project: project.path, root: configuration.workspaceRoot, uid: identity.uid, action: action, session: session)
        } catch { publish("Failed: " + error.localizedDescription); throw error }
    }
}
