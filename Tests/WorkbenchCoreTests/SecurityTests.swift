import XCTest
@testable import WorkbenchCore
final class SecurityTests: XCTestCase {
    func requireIntegration() throws {
        guard ProcessInfo.processInfo.environment["AGENT_WORKBENCH_INTEGRATION"] == "1" else {
            throw XCTSkip("Opt-in integration test: requires a standard agent account and installed runtime")
        }
    }
    func fixture(_ body: (String, String) throws -> Void) throws {
        let base = FileManager.default.temporaryDirectory.resolvingSymlinksInPath().appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: base) }
        let root = base.appendingPathComponent("AgentWork").path
        let outside = base.appendingPathComponent("AgentWork-secret").path
        try FileManager.default.createDirectory(atPath: root, withIntermediateDirectories: false)
        try FileManager.default.createDirectory(atPath: outside, withIntermediateDirectories: false)
        try body(WorkspaceValidation.canonical(root), WorkspaceValidation.canonical(outside))
    }
    func testRejectsTraversalAndSiblingPrefix() throws { try fixture { root, outside in
        XCTAssertThrowsError(try WorkspaceValidation.project(root + "/../../my-secret", root: root))
        XCTAssertThrowsError(try WorkspaceValidation.project(outside, root: root))
        XCTAssertThrowsError(try WorkspaceValidation.project(root, root: root))
        XCTAssertThrowsError(try WorkspaceValidation.project("relative", root: root))
        XCTAssertThrowsError(try WorkspaceValidation.project(root + "/\0", root: root))
    } }
    func testRejectsSymlinkEscapeAndRootAlias() throws { try fixture { root, outside in
        try FileManager.default.createSymbolicLink(atPath: root + "/project", withDestinationPath: outside)
        XCTAssertThrowsError(try WorkspaceValidation.project(root + "/project", root: root))
        let alias = outside + "/alias"
        try FileManager.default.createSymbolicLink(atPath: alias, withDestinationPath: root)
        XCTAssertThrowsError(try WorkspaceValidation.project(alias + "/project", root: alias))
    } }
    func testValidUnusualNames() throws { try fixture { root, _ in
        for name in ["space name", "quote'", "double\"", "$HOME", ";echo injected", "a&b"] {
            let path = root + "/" + name
            try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: false)
            XCTAssertEqual(try WorkspaceValidation.project(path, root: root), path)
        }
    } }
    func testShellQuotingRoundTripAndNoExecution() throws {
        for text in ["space name", "a'b", "a\"b", "$HOME", "; echo BAD", "a&b", "$(echo BAD)", "`echo BAD`", "\nexit 99", ""] {
            let result = try ProcessRunner.run("/bin/zsh", ["-fc", "printf '%s' " + Shell.quote(text)])
            XCTAssertEqual(result.status, 0); XCTAssertEqual(result.output, text)
        }
    }
    func testGitMetadataEscapeRejected() throws { try fixture { root, outside in
        let project = root + "/project"
        try FileManager.default.createDirectory(atPath: project, withIntermediateDirectories: false)
        try "gitdir: \(outside)".write(toFile: project + "/.git", atomically: true, encoding: .utf8)
        XCTAssertThrowsError(try WorkspaceValidation.project(project, root: root))
    } }
    func testRejectsMainUIDSupervisor() throws { try fixture { root, _ in
        XCTAssertThrowsError(try ProcessRunner.supervise(project: root, root: root, uid: 0, action: .terminal, session: root))
    } }
    func testEnvironmentDeniesCredentialsAndShellControls() throws {
        for key in ["AWS_ACCESS_KEY_ID", "GITHUB_TOKEN", "GH_TOKEN", "VERCEL_TOKEN", "CLOUDFLARE_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "SSH_AUTH_SOCK", "PATH", "ZDOTDIR", "DYLD_INSERT_LIBRARIES", "BASH_ENV"] { XCTAssertThrowsError(try WorkspaceValidation.environment([key: "value"])) }
        XCTAssertNoThrow(try WorkspaceValidation.environment(["PORT": "3000", "NODE_ENV": "development"]))
    }
    func testSupervisorStopsItsOwnChild() throws { try fixture { root, _ in
        // Pre-existing request also covers a stop sent before process startup.
        try Data().write(to: URL(fileURLWithPath: root + "/stop"))
        let start = Date()
        try ProcessRunner.superviseChild(args: ["/bin/sleep", "30"], session: root)
        XCTAssertLessThan(Date().timeIntervalSince(start), 5)
        XCTAssertTrue(try String(contentsOfFile: root + "/state", encoding: .utf8).hasPrefix("Stopped"))
    } }
    func testIsolatedRepositoryDoesNotReferenceSource() throws {
        try requireIntegration()
        try fixture { root, source in
        try ProcessRunner.checked("/usr/bin/git", ["init", "--initial-branch=main", source])
        try "hello".write(toFile: source + "/hello.txt", atomically: true, encoding: .utf8)
        try ProcessRunner.checked("/usr/bin/git", ["-C", source, "add", "hello.txt"])
        try ProcessRunner.checked("/usr/bin/git", ["-C", source, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture"])
        try ProcessRunner.checked("/usr/bin/git", ["-C", source, "config", "credential.helper", "DO_NOT_COPY"])
        let store = ConfigurationStore(url: URL(fileURLWithPath: source + "/workbench.json"))
        var config = Configuration(); config.workspaceRoot = root; try store.save(config)
        let workbench = Workbench(store: store)
        let plan = try workbench.planRepository(source: source, name: "project ' $ ; &", branch: "agent/test")
        try workbench.createRepository(plan)
        XCTAssertEqual(try WorkspaceValidation.project(plan.destination, root: root), plan.destination)
        XCTAssertFalse(FileManager.default.fileExists(atPath: plan.mirror + "/objects/info/alternates"))
        XCTAssertEqual(try ProcessRunner.checked("/usr/bin/git", ["--git-dir", plan.mirror, "remote"]), "")
        XCTAssertEqual(try ProcessRunner.run("/usr/bin/git", ["--git-dir", plan.mirror, "config", "--local", "--get", "credential.helper"]).status, 1)
        XCTAssertEqual(try ProcessRunner.checked("/usr/bin/git", ["-C", source, "branch", "--list", "agent/test"]), "")
        XCTAssertEqual(try store.load().projects.count, 1)
    } }
    func testLaunchRequestIsShortAndRejectsTampering() throws {
        try requireIntegration()
        try fixture { root, _ in
        let path = root + "/project ' ; $ &"
        try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: false)
        let project = Project(name: "project ' ; $ &", path: path)
        var config = Configuration(); config.workspaceRoot = root
        let session = try Sessions.prepare(project, action: .codex)
        let id = URL(fileURLWithPath: session).lastPathComponent
        let requestFile = Sessions.runtime + "/requests/" + id + ".json"
        defer { try? FileManager.default.removeItem(atPath: session); try? FileManager.default.removeItem(atPath: requestFile) }
        let command = try Launcher.command(project: project, configuration: config, action: .codex, session: session)
        XCTAssertFalse(command.contains("\n")); XCTAssertFalse(command.contains(project.path))
        XCTAssertFalse(command.contains("sudo")); XCTAssertTrue(command.contains(" start "))
        let request = try LaunchRequest.load(requestFile)
        XCTAssertEqual(request.project.path, path)
        XCTAssertThrowsError(try request.runAsAgent())
        XCTAssertTrue(try String(contentsOfFile: session + "/state", encoding: .utf8).hasPrefix("Failed:"))
        try FileManager.default.setAttributes([.posixPermissions: 0o666], ofItemAtPath: requestFile)
        XCTAssertThrowsError(try LaunchRequest.load(requestFile))
    } }
    func testConfigurationRoundTrip() throws { try fixture { root, _ in
        let store = ConfigurationStore(url: URL(fileURLWithPath: root + "/config.json"))
        var config = Configuration(); config.projects = [Project(name: "example", path: root + "/example")]
        try store.save(config); XCTAssertEqual(try store.load().projects, config.projects)
    } }
    func testRealAgentUIDLaunchOnDisposableCIHost() throws {
        try requireIntegration()
        guard ProcessInfo.processInfo.environment["CI"] == "true" else {
            throw XCTSkip("Requires the disposable CI host with HOME protection applied")
        }
        let configuration = Configuration()
        let path = configuration.workspaceRoot + "/test-" + UUID().uuidString
        try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(atPath: path) }
        let project = Project(name: "CI terminal", path: path)
        let session = try Sessions.prepare(project, action: .terminal)
        let id = URL(fileURLWithPath: session).lastPathComponent
        let requestFile = Sessions.runtime + "/requests/" + id + ".json"
        defer {
            try? FileManager.default.removeItem(atPath: session)
            try? FileManager.default.removeItem(atPath: requestFile)
        }
        _ = try Launcher.command(project: project, configuration: configuration, action: .terminal, session: session)
        let result = try ProcessRunner.run("/usr/bin/sudo", [
            "-n", "-iu", "agent", "/usr/bin/env", "-i",
            "HOME=/Users/agent", "USER=agent", "LOGNAME=agent",
            "PATH=/usr/bin:/bin:/usr/sbin:/sbin", "TERM=xterm-256color",
            Sessions.runtime + "/agentctl", "__run", requestFile
        ])
        XCTAssertEqual(result.status, 0, result.output)
        let identity = try AgentIdentity.inspect("agent")
        XCTAssertTrue(result.output.contains("Account verified: agent · UID \(identity.uid)"), result.output)
        XCTAssertTrue(result.output.contains("Workspace: " + path), result.output)
        XCTAssertEqual(try String(contentsOfFile: session + "/state", encoding: .utf8), "Finished")
    }
}
