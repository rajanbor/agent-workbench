import Foundation
import Darwin
public struct RepositoryPlan: Sendable {
    public let source: String
    public let destination: String
    public let branch: String
    public let mirror: String
    public var preview: String { "Source: \(source)\nDestination: \(destination)\nBranch: \(branch)\nIsolated Git metadata: \(mirror)\n\nOnly committed history is copied. No credentials, hooks or working changes are copied." }
}
public extension Workbench {
    func planRepository(source: String, name: String, branch: String) throws -> RepositoryPlan {
        let config = try store.load()
        let root = try WorkspaceValidation.canonical(config.workspaceRoot)
        guard root == config.workspaceRoot, !name.isEmpty, name != ".", name != "..", !name.hasPrefix("."), !name.contains("/"), !name.contains("\n"), !name.utf8.contains(0) else { throw WorkbenchError.invalid("Use a simple, non-hidden workspace name") }
        let source = try WorkspaceValidation.canonical(source)
        _ = try ProcessRunner.checked("/usr/bin/git", ["-C", source, "rev-parse", "--show-toplevel"])
        _ = try ProcessRunner.checked("/usr/bin/git", ["check-ref-format", "--branch", branch])
        guard branch.hasPrefix("agent/") else { throw WorkbenchError.invalid("Branch must start with agent/") }
        let destination = root + "/" + name
        guard !FileManager.default.fileExists(atPath: destination) else { throw WorkbenchError.invalid("Destination already exists") }
        return RepositoryPlan(source: source, destination: destination, branch: branch, mirror: root + "/.repositories/" + UUID().uuidString + ".git")
    }
    func createRepository(_ plan: RepositoryPlan) throws {
        let config = try store.load()
        _ = try AgentIdentity.inspect(config.agentUser)
        // Revalidate before mutation. Parent metadata directory may not be a symlink.
        let checked = try planRepository(source: plan.source, name: URL(fileURLWithPath: plan.destination).lastPathComponent, branch: plan.branch)
        guard checked.destination == plan.destination else { throw WorkbenchError.invalid("Workspace changed; create a new plan") }
        let parent = URL(fileURLWithPath: plan.mirror).deletingLastPathComponent().path
        guard parent == config.workspaceRoot + "/.repositories" else { throw WorkbenchError.invalid("Invalid metadata directory") }
        if !FileManager.default.fileExists(atPath: parent) { try FileManager.default.createDirectory(atPath: parent, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o770]) }
        guard try WorkspaceValidation.canonical(parent) == parent else { throw WorkbenchError.invalid("Metadata directory is a symlink") }
        guard !FileManager.default.fileExists(atPath: plan.mirror) else { throw WorkbenchError.invalid("Metadata destination already exists") }
        // --no-local copies objects without hardlinks/alternates to private source objects.
        try ProcessRunner.checked("/usr/bin/git", ["clone", "--bare", "--no-local", "--", plan.source, plan.mirror])
        try ProcessRunner.checked("/usr/bin/git", ["--git-dir", plan.mirror, "remote", "remove", "origin"])
        try ProcessRunner.checked("/usr/bin/git", ["--git-dir", plan.mirror, "config", "core.sharedRepository", "group"])
        try ProcessRunner.checked("/usr/bin/git", ["--git-dir", plan.mirror, "worktree", "add", "-b", plan.branch, "--", plan.destination])
        // Add access only to the newly created workspace + its isolated metadata.
        for path in [plan.mirror, plan.destination] {
            for user in ["agent", NSUserName()] {
                try ProcessRunner.checked("/bin/chmod", ["-R", "+a", "user:\(user) allow read,write,execute,delete,delete_child,append,readattr,writeattr,readextattr,writeextattr,readsecurity,file_inherit,directory_inherit", path])
            }
        }
        try register(path: plan.destination)
    }
}
