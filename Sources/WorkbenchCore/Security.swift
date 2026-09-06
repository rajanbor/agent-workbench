import Foundation
import Darwin
public enum WorkspaceValidation {
    public static func canonical(_ path: String) throws -> String {
        guard path.hasPrefix("/"), !path.utf8.contains(0), !path.components(separatedBy: "/").contains("..") else { throw WorkbenchError.invalid("Absolute path without traversal required") }
        guard let resolved = realpath(path, nil) else { throw WorkbenchError.invalid("Path does not exist or is inaccessible: \(path)") }
        defer { free(resolved) }; return String(cString: resolved)
    }
    public static func project(_ path: String, root: String) throws -> String {
        let base = try canonical(root)
        guard base == root, base != "/", base != "/Users", base != "/Users/Shared" else { throw WorkbenchError.invalid("Workspace root must be a real dedicated directory, not a symlink") }
        let resolved = try canonical(path)
        guard resolved.hasPrefix(base + "/"), resolved != base + "/.repositories", !resolved.hasPrefix(base + "/.repositories/") else { throw WorkbenchError.invalid("Project escapes workspace or points to internal metadata") }
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: resolved, isDirectory: &isDirectory), isDirectory.boolValue else { throw WorkbenchError.invalid("Project must be a directory") }
        try gitMetadata(resolved, root: base)
        return resolved
    }
    public static func gitMetadata(_ project: String, root: String) throws {
        let dotGit = project + "/.git"
        guard FileManager.default.fileExists(atPath: dotGit) else { return }
        var directory: ObjCBool = false
        FileManager.default.fileExists(atPath: dotGit, isDirectory: &directory)
        let gitDir: String
        if directory.boolValue { gitDir = try canonical(dotGit) }
        else {
            let resolvedFile = try canonical(dotGit)
            guard resolvedFile.hasPrefix(root + "/") else { throw WorkbenchError.invalid("Git metadata file escapes workspace") }
            let text = try String(contentsOfFile: resolvedFile, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
            guard text.hasPrefix("gitdir: ") else { throw WorkbenchError.invalid("Invalid .git file") }
            let target = String(text.dropFirst(8))
            gitDir = try canonical(target.hasPrefix("/") ? target : project + "/" + target)
        }
        guard gitDir.hasPrefix(root + "/") else { throw WorkbenchError.invalid("Git metadata points outside workspace. Create an isolated repository copy.") }
        let commonFile = gitDir + "/commondir"
        if FileManager.default.fileExists(atPath: commonFile) {
            let text = try String(contentsOfFile: commonFile, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
            // Git-generated commondir legitimately contains ../..; resolve it separately.
            let url = URL(fileURLWithPath: text.hasPrefix("/") ? text : gitDir + "/" + text).standardizedFileURL
            let common = try canonical(url.path)
            guard common.hasPrefix(root + "/") else { throw WorkbenchError.invalid("Git common directory escapes workspace") }
        }
    }
    public static func environment(_ values: [String: String]) throws {
        // Deliberately small allowlist: no PATH, loaders, shell startup controls or credentials.
        let allowed: Set<String> = ["NODE_ENV", "PORT", "TZ", "LANG", "LC_ALL", "CI"]
        guard values.allSatisfy({ allowed.contains($0.key) && !$0.value.utf8.contains(0) && !$0.value.contains("\n") }) else { throw WorkbenchError.invalid("Only non-secret NODE_ENV, PORT, TZ, LANG, LC_ALL and CI variables are supported") }
    }
}
public enum Shell {
    public static func quote(_ value: String) -> String { "'" + value.replacingOccurrences(of: "'", with: "'\\''") + "'" }
}
public struct AgentIdentity: Sendable {
    public let uid: uid_t
    public let home: String
    public static func inspect(_ name: String, allowCurrentAgent: Bool = false) throws -> AgentIdentity {
        guard name == "agent", let record = getpwnam(name) else { throw WorkbenchError.invalid("Create the standard macOS account ‘agent’ in System Settings → Users & Groups") }
        let uid = record.pointee.pw_uid; let home = String(cString: record.pointee.pw_dir)
        guard uid != 0, (allowCurrentAgent || uid != getuid()) else { throw WorkbenchError.invalid("Agent must have a separate, non-root UID") }
        let groups = try ProcessRunner.checked("/usr/bin/id", ["-Gn", name]).split(separator: " ")
        guard !groups.contains("admin"), !groups.contains("wheel") else { throw WorkbenchError.invalid("Agent has administrator privileges. Remove them before launching.") }
        return AgentIdentity(uid: uid, home: home)
    }
}
