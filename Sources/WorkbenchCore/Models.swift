import Foundation
public enum WorkbenchError: Error, LocalizedError {
    case invalid(String)
    public var errorDescription: String? { switch self { case .invalid(let message): message } }
}
public enum TerminalChoice: String, Codable, CaseIterable, Sendable { case terminal = "Terminal", iterm = "iTerm" }
public enum AgentProfile: String, Codable, CaseIterable, Sendable { case safe = "Safe", network = "Network" }
public enum RuntimeMode: String, Codable, CaseIterable, Sendable { case macOSUser, docker }
public struct Project: Codable, Identifiable, Sendable, Equatable {
    public var id: UUID = UUID()
    public var name: String
    public var path: String
    public var profile: AgentProfile = .safe
    public var environment: [String: String] = [:]
    public var lastLaunch: Date?
    public init(name: String, path: String) { self.name = name; self.path = path }
}
public struct Configuration: Codable, Sendable {
    public var agentUser = "agent"
    public var workspaceRoot = "/Users/Shared/AgentWork"
    public var terminal: TerminalChoice = .terminal
    public var runtimeMode: RuntimeMode = .macOSUser
    public var projects: [Project] = []
    public init() {}
    enum CodingKeys: String, CodingKey { case agentUser, workspaceRoot, terminal, runtimeMode, projects }
    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        agentUser = try values.decodeIfPresent(String.self, forKey: .agentUser) ?? "agent"
        workspaceRoot = try values.decodeIfPresent(String.self, forKey: .workspaceRoot) ?? "/Users/Shared/AgentWork"
        terminal = try values.decodeIfPresent(TerminalChoice.self, forKey: .terminal) ?? .terminal
        runtimeMode = try values.decodeIfPresent(RuntimeMode.self, forKey: .runtimeMode) ?? .macOSUser
        projects = try values.decodeIfPresent([Project].self, forKey: .projects) ?? []
    }
}
public struct ConfigurationStore: Sendable {
    public let url: URL
    public init(url: URL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/AgentWorkbench/config.json")) { self.url = url }
    public func load() throws -> Configuration {
        guard FileManager.default.fileExists(atPath: url.path) else { return Configuration() }
        return try JSONDecoder().decode(Configuration.self, from: Data(contentsOf: url))
    }
    public func save(_ configuration: Configuration) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(configuration).write(to: url, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }
}
