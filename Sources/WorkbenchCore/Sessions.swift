import Foundation
import Darwin
public struct SessionRecord: Codable, Sendable, Identifiable {
    public var id: String
    public var projectID: UUID
    public var action: String
    public var created: Date
}
public enum Sessions {
    public static var runtime: String { "/Users/Shared/AgentWorkbench-\(getuid())" }
    public static func validateRuntime() throws {
        for path in [runtime, runtime + "/agentctl"] {
            let permissions = try ProcessRunner.checked("/bin/ls", ["-lde", path]).split(separator: " ").first ?? ""
            guard !permissions.contains("+") else { throw WorkbenchError.invalid("Trusted runtime must not have extended ACL permissions") }
            var info = stat()
            guard lstat(path, &info) == 0, info.st_uid == getuid(), info.st_mode & 0o022 == 0,
                  info.st_mode & S_IFMT != S_IFLNK else { throw WorkbenchError.invalid("Install the trusted launcher first: bash scripts/install.sh. Unsafe or missing runtime: \(path)") }
        }
    }
    public static func prepare(_ project: Project, action: LaunchAction) throws -> String {
        try validateRuntime()
        let base = runtime + "/sessions"
        try FileManager.default.createDirectory(atPath: base, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o755])
        let id = UUID().uuidString; let path = base + "/" + id
        try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        try ProcessRunner.checked("/bin/chmod", ["+a", "user:agent allow read,write,execute,delete,delete_child,append,readattr,writeattr,readextattr,writeextattr,readsecurity,file_inherit,directory_inherit", path])
        try ProcessRunner.checked("/bin/chmod", ["+a", "user:\(NSUserName()) allow read,execute,readattr,readextattr,readsecurity,file_inherit,directory_inherit", path])
        let record = SessionRecord(id: id, projectID: project.id, action: action.rawValue, created: Date())
        try JSONEncoder().encode(record).write(to: URL(fileURLWithPath: path + "/record.json"), options: .atomic)
        return path
    }
    public static func records(projectID: UUID) -> [SessionRecord] {
        let base = URL(fileURLWithPath: runtime + "/sessions")
        return ((try? FileManager.default.contentsOfDirectory(at: base, includingPropertiesForKeys: nil)) ?? []).compactMap { dir in
            guard let data = try? Data(contentsOf: dir.appendingPathComponent("record.json")), let record = try? JSONDecoder().decode(SessionRecord.self, from: data), record.projectID == projectID, record.id == dir.lastPathComponent else { return nil }
            return record
        }.sorted { $0.created > $1.created }
    }
    public static func state(_ record: SessionRecord) -> String {
        let path = runtime + "/sessions/" + record.id + "/state"
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: path), let date = attributes[.modificationDate] as? Date,
              let contents = try? String(contentsOfFile: path, encoding: .utf8) else { return Date().timeIntervalSince(record.created) > 300 ? "Not started (authentication not completed)" : "Awaiting terminal / authentication" }
        if contents.hasPrefix("Running"), Date().timeIntervalSince(date) > 4 { return "Unknown (supervisor not responding)" }
        return contents.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    public static func stop(_ record: SessionRecord) throws {
        guard UUID(uuidString: record.id) != nil else { throw WorkbenchError.invalid("Invalid session") }
        // Never signal a PID read from disk. The live supervisor holds its own unreaped child.
        let path = runtime + "/sessions/" + record.id + "/stop"
        let fd = Darwin.open(path, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, 0o644)
        if fd < 0 { if errno == EEXIST { return }; throw WorkbenchError.invalid("Cannot request stop") }
        close(fd)
    }
}
public extension ProcessRunner {
    static func supervise(project: String, root: String, uid: uid_t, action: LaunchAction, session: String) throws {
        guard getuid() == uid, uid != 0, let record = getpwnam("agent"), record.pointee.pw_uid == uid else { throw WorkbenchError.invalid("Supervisor requires the agent UID") }
        let path = try WorkspaceValidation.project(project, root: root)
        guard chdir(path) == 0 else { throw WorkbenchError.invalid("Cannot enter workspace") }
        // Pin cwd before starting child and re-check physical path.
        guard FileManager.default.currentDirectoryPath == path else { throw WorkbenchError.invalid("Workspace changed") }
        let args = action == .terminal ? ["/bin/zsh", "-i"] : ["/usr/bin/env", action.rawValue]
        try superviseChild(args: args, session: session)
    }
    internal static func superviseChild(args: [String], session: String) throws {
        let cargs = args.map { strdup($0)! }; defer { cargs.forEach { free($0) } }
        var argv: [UnsafeMutablePointer<CChar>?] = cargs.map { $0 } + [nil]
        var attrs: posix_spawnattr_t?; posix_spawnattr_init(&attrs); defer { posix_spawnattr_destroy(&attrs) }
        var defaults = sigset_t(); sigemptyset(&defaults); sigaddset(&defaults, SIGINT); sigaddset(&defaults, SIGTERM); sigaddset(&defaults, SIGQUIT)
        posix_spawnattr_setsigdefault(&attrs, &defaults)
        posix_spawnattr_setpgroup(&attrs, 0)
        posix_spawnattr_setflags(&attrs, Int16(POSIX_SPAWN_SETPGROUP | POSIX_SPAWN_SETSIGDEF))
        signal(SIGTTOU, SIG_IGN); signal(SIGINT, SIG_IGN); signal(SIGQUIT, SIG_IGN)
        let cenv = ProcessInfo.processInfo.environment.map { strdup($0.key + "=" + $0.value)! }
        defer { cenv.forEach { free($0) } }
        var envp: [UnsafeMutablePointer<CChar>?] = cenv.map { $0 } + [nil]
        var child: pid_t = 0
        let result = posix_spawn(&child, args[0], nil, &attrs, &argv, &envp)
        guard result == 0 else { throw WorkbenchError.invalid("Cannot start agent: \(result)") }
        _ = tcsetpgrp(STDIN_FILENO, child)
        kill(child, SIGCONT)
        defer { _ = tcsetpgrp(STDIN_FILENO, getpgrp()) }
        var status: Int32 = 0; var stopped = false
        while waitpid(child, &status, WNOHANG) == 0 {
            let state = stopped ? "Stopping (SIGTERM sent)" : "Running (PID \(child))"
            try? state.write(toFile: session + "/state", atomically: true, encoding: .utf8)
            if !stopped, FileManager.default.fileExists(atPath: session + "/stop") {
                // Child has not been reaped: its PID cannot be recycled. Signal its group.
                kill(-child, SIGTERM); stopped = true
            }
            usleep(250_000)
        }
        try? (stopped ? "Stopped" : status == 0 ? "Finished" : "Failed: Process exited (status \((status >> 8) & 0xff), signal \(status & 0x7f)). See Terminal for details.").write(toFile: session + "/state", atomically: true, encoding: .utf8)
    }
}
