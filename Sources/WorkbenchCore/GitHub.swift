import Foundation
import Darwin

/// Metadata returned by GitHub CLI. It deliberately contains no token or clone credential.
public struct GitHubRepository: Codable, Identifiable, Sendable, Equatable, Hashable {
    public let name: String
    public let nameWithOwner: String
    public let description: String?
    public let isPrivate: Bool
    public let url: String
    public let visibility: String
    public var id: String { nameWithOwner }
}

public struct GitHubAccount: Sendable, Equatable {
    public let login: String
}

public enum GitHubAccess {
    private struct APIRepository: Decodable {
        let name: String
        let fullName: String
        let description: String?
        let isPrivate: Bool
        let htmlURL: String
        let visibility: String?

        enum CodingKeys: String, CodingKey {
            case name, description, visibility
            case fullName = "full_name"
            case isPrivate = "private"
            case htmlURL = "html_url"
        }
    }
    private static func executable() throws -> String {
        for candidate in ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"] where FileManager.default.isExecutableFile(atPath: candidate) {
            return candidate
        }
        if (try? ProcessRunner.run("/usr/bin/which", ["gh"]).status) == 0 { return "gh" }
        throw WorkbenchError.invalid("GitHub CLI is required. Install it from cli.github.com, then try again.")
    }

    public static func loginCommand() throws -> String {
        let gh = try executable()
        return [gh, "auth", "login", "--web", "--git-protocol", "https"].map(Shell.quote).joined(separator: " ")
    }

    public static func account() throws -> GitHubAccount {
        let gh = try executable()
        let result = try ProcessRunner.run(gh, ["api", "user", "--jq", ".login"])
        guard result.status == 0 else {
            throw WorkbenchError.invalid("Connect GitHub first. The login happens in your browser and is stored by GitHub CLI in macOS Keychain.")
        }
        let login = result.output.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !login.isEmpty, !login.contains("\n") else { throw WorkbenchError.invalid("GitHub returned an invalid account name") }
        return GitHubAccount(login: login)
    }

    public static func repositories() throws -> [GitHubRepository] {
        let gh = try executable()
        // Include personal, organisation and collaborator repositories the account can read.
        let output = try ProcessRunner.checked(gh, ["api", "--paginate", "--slurp", "user/repos?affiliation=owner,collaborator,organization_member&per_page=100"])
        let pages = try JSONDecoder().decode([[APIRepository]].self, from: Data(output.utf8))
        let repositories = pages.flatMap { $0 }.map {
            GitHubRepository(name: $0.name, nameWithOwner: $0.fullName, description: $0.description, isPrivate: $0.isPrivate, url: $0.htmlURL, visibility: $0.visibility ?? ($0.isPrivate ? "PRIVATE" : "PUBLIC"))
        }
        return repositories.sorted { $0.nameWithOwner.localizedCaseInsensitiveCompare($1.nameWithOwner) == .orderedAscending }
    }

    static func validRepositoryName(_ value: String) -> Bool {
        let pieces = value.split(separator: "/", omittingEmptySubsequences: false)
        return pieces.count == 2 && pieces.allSatisfy { part in
            !part.isEmpty && part.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" || $0 == "." }
        }
    }

    static func clone(_ repository: GitHubRepository, into destination: String) throws {
        guard validRepositoryName(repository.nameWithOwner) else { throw WorkbenchError.invalid("Invalid GitHub repository") }
        let gh = try executable()
        // GitHub CLI owns the token in Keychain. This narrow Git config asks CLI for
        // HTTPS credentials without loading arbitrary user Git configuration.
        let credentialConfig = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let config = "[credential \"https://github.com\"]\n\thelper = !\(gh) auth git-credential\n\tuseHttpPath = true\n"
        guard FileManager.default.createFile(atPath: credentialConfig.path, contents: Data(config.utf8), attributes: [.posixPermissions: 0o600]) else {
            throw WorkbenchError.invalid("Cannot create temporary GitHub credential configuration")
        }
        defer { try? FileManager.default.removeItem(at: credentialConfig) }
        try ProcessRunner.checked(gh, ["repo", "clone", repository.nameWithOwner, destination, "--", "--depth=1"], environment: ["GIT_CONFIG_GLOBAL": credentialConfig.path])
    }
}

public extension Workbench {
    /// Clone with the main user's GitHub CLI credentials, then immediately create an isolated copy.
    /// The temporary checkout is never made available to the agent and is removed after import.
    func importGitHubRepository(_ repository: GitHubRepository, name: String, branch: String) throws {
        _ = try GitHubAccess.account()
        try Sessions.validateRuntime()
        let imports = Sessions.runtime + "/github-imports"
        if !FileManager.default.fileExists(atPath: imports) {
            try FileManager.default.createDirectory(atPath: imports, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        }
        var info = stat()
        guard lstat(imports, &info) == 0, info.st_uid == getuid(), info.st_mode & 0o022 == 0,
              info.st_mode & S_IFMT != S_IFLNK, try WorkspaceValidation.canonical(imports) == imports else {
            throw WorkbenchError.invalid("Unsafe GitHub import staging directory")
        }
        let checkout = imports + "/" + UUID().uuidString
        defer { try? FileManager.default.removeItem(atPath: checkout) }
        try GitHubAccess.clone(repository, into: checkout)
        let plan = try planRepository(source: checkout, name: name, branch: branch)
        try createRepository(plan)
    }
}
