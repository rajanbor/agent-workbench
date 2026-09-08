import Foundation
import Darwin
public struct ProcessResult: Sendable {
    public let status: Int32
    public let output: String
}
public enum ProcessRunner {
    // Explicit environment; never pass the GUI account's tokens or agent sockets.
    public static var cleanEnvironment: [String: String] {
        ["PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin", "HOME": FileManager.default.homeDirectoryForCurrentUser.path, "LANG": "en_US.UTF-8", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1", "GIT_TERMINAL_PROMPT": "0"]
    }
    public static func run(_ executable: String, _ arguments: [String], directory: String? = nil, environment overrides: [String: String] = [:]) throws -> ProcessResult {
        let process = Process(); process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments; process.environment = cleanEnvironment.merging(overrides, uniquingKeysWith: { _, replacement in replacement })
        if let directory { process.currentDirectoryURL = URL(fileURLWithPath: directory) }
        // Regular temporary file avoids pipe buffer deadlocks for large Git output.
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        guard FileManager.default.createFile(atPath: url.path, contents: nil, attributes: [.posixPermissions: 0o600]) else { throw WorkbenchError.invalid("Cannot create process output file") }
        defer { try? FileManager.default.removeItem(at: url) }
        let output = try FileHandle(forWritingTo: url); defer { try? output.close() }
        process.standardOutput = output; process.standardError = output; process.standardInput = FileHandle.nullDevice
        try process.run(); process.waitUntilExit()
        return ProcessResult(status: process.terminationStatus, output: String(decoding: try Data(contentsOf: url), as: UTF8.self))
    }
    public static func interactive(_ executable: String, _ arguments: [String]) throws -> Int32 {
        let strings = ([executable] + arguments).map { strdup($0)! }
        defer { strings.forEach { free($0) } }
        var argv: [UnsafeMutablePointer<CChar>?] = strings.map { $0 } + [nil]
        let environment = cleanEnvironment.map { strdup($0.key + "=" + $0.value)! }
        defer { environment.forEach { free($0) } }
        var envp: [UnsafeMutablePointer<CChar>?] = environment.map { $0 } + [nil]
        var child: pid_t = 0
        // Inherit the CLI's foreground process group so sudo can read /dev/tty.
        let result = posix_spawn(&child, executable, nil, nil, &argv, &envp)
        guard result == 0 else { throw WorkbenchError.invalid("Cannot start sudo (\(result))") }
        var status: Int32 = 0
        while waitpid(child, &status, 0) == -1 { if errno != EINTR { throw WorkbenchError.invalid("Cannot wait for account switch") } }
        return status & 0x7f == 0 ? (status >> 8) & 0xff : 128 + (status & 0x7f)
    }
    @discardableResult public static func checked(_ executable: String, _ arguments: [String], directory: String? = nil, environment: [String: String] = [:]) throws -> String {
        let result = try run(executable, arguments, directory: directory, environment: environment)
        guard result.status == 0 else { throw WorkbenchError.invalid(result.output.isEmpty ? "Command failed (\(result.status))" : result.output) }
        return result.output.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
