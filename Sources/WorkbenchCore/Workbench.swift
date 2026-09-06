import Foundation
import Darwin
public struct Workbench: Sendable {
    public let store: ConfigurationStore
    public init(store: ConfigurationStore = ConfigurationStore()) { self.store = store }
    public func register(path: String) throws {
        var configuration = try store.load()
        let path = try WorkspaceValidation.project(path, root: configuration.workspaceRoot)
        guard !configuration.projects.contains(where: { $0.path == path }) else { throw WorkbenchError.invalid("Project already registered") }
        configuration.projects.append(Project(name: URL(fileURLWithPath: path).lastPathComponent, path: path))
        try store.save(configuration)
    }
    public func launch(_ project: Project, action: LaunchAction) throws {
        var config = try store.load()
        let session = try Sessions.prepare(project, action: action)
        let command = try Launcher.command(project: project, configuration: config, action: action, session: session)
        try Launcher.open(command: command, terminal: config.terminal)
        if let index = config.projects.firstIndex(where: { $0.id == project.id }) { config.projects[index].lastLaunch = Date(); try store.save(config) }
    }
    public func gitStatus(_ project: Project) throws -> String {
        let config = try store.load()
        let path = try WorkspaceValidation.project(project.path, root: config.workspaceRoot)
        // Git can run repository-defined filters. Never inspect agent-modifiable Git as the main UID.
        let identity = try AgentIdentity.inspect(config.agentUser)
        let args = ["-n", "-iu", "agent", "/usr/bin/env", "-i", "HOME=\(identity.home)", "USER=agent", "LOGNAME=agent", "PATH=/usr/bin:/bin:/usr/sbin:/sbin", "GIT_CONFIG_GLOBAL=/dev/null", "GIT_CONFIG_SYSTEM=/dev/null", "/usr/bin/git", "--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "safe.directory=\(path)", "-c", "core.hooksPath=/dev/null", "-C", path, "status", "--short", "--branch"]
        return try ProcessRunner.checked("/usr/bin/sudo", args)
    }
    public func createWorkspaceRoot() throws {
        let config = try store.load()
        guard config.workspaceRoot == "/Users/Shared/AgentWork" else { throw WorkbenchError.invalid("Unexpected workspace root") }
        if FileManager.default.fileExists(atPath: config.workspaceRoot) { _ = try WorkspaceValidation.canonical(config.workspaceRoot); return }
        try FileManager.default.createDirectory(atPath: config.workspaceRoot, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o770])
    }
    public func removeRegistration(_ project: Project) throws {
        var config = try store.load(); config.projects.removeAll { $0.id == project.id }; try store.save(config)
    }
}

public extension Workbench {
    /// Remove from active workspace by archiving, never recursively deleting a source repo.
    func archiveWorkspace(_ project: Project) throws -> String {
        let config = try store.load()
        let path = try WorkspaceValidation.project(project.path, root: config.workspaceRoot)
        guard URL(fileURLWithPath: path).deletingLastPathComponent().path == config.workspaceRoot else { throw WorkbenchError.invalid("Only direct workspace children can be archived. Nested projects can be unregistered without deleting files.") }
        guard Sessions.records(projectID: project.id).allSatisfy({ !Sessions.state($0).hasPrefix("Running") && !Sessions.state($0).hasPrefix("Stopping") }) else { throw WorkbenchError.invalid("Stop the project's sessions before removing it") }
        try Sessions.validateRuntime()
        let archive = Sessions.runtime + "/removed"
        if !FileManager.default.fileExists(atPath: archive) { try FileManager.default.createDirectory(atPath: archive, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700]) }
        let rootFD = Darwin.open(config.workspaceRoot, O_RDONLY | O_DIRECTORY | O_NOFOLLOW)
        let archiveFD = Darwin.open(archive, O_RDONLY | O_DIRECTORY | O_NOFOLLOW)
        guard rootFD >= 0, archiveFD >= 0 else { if rootFD >= 0 { close(rootFD) }; if archiveFD >= 0 { close(archiveFD) }; throw WorkbenchError.invalid("Cannot securely open workspace directories") }
        defer { close(rootFD); close(archiveFD) }
        let name = UUID().uuidString + "-" + URL(fileURLWithPath: path).lastPathComponent
        guard renameat(rootFD, URL(fileURLWithPath: path).lastPathComponent, archiveFD, name) == 0 else { throw WorkbenchError.invalid("Cannot archive workspace; files were retained") }
        try removeRegistration(project)
        return archive + "/" + name
    }
}
