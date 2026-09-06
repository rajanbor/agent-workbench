import Foundation
import Darwin
public enum LaunchAction: String, Sendable { case terminal, codex, claude }
public enum Launcher {
    public static func command(project: Project, configuration: Configuration, action: LaunchAction, session: String? = nil) throws -> String {
        _ = try AgentIdentity.inspect(configuration.agentUser)
        _ = try WorkspaceValidation.project(project.path, root: configuration.workspaceRoot)
        try WorkspaceValidation.environment(project.environment)
        guard let session else { throw WorkbenchError.invalid("A tracked session is required") }
        let request = LaunchRequest(project: project, configuration: configuration, action: action.rawValue,
                                    mainUID: getuid(), mainHome: FileManager.default.homeDirectoryForCurrentUser.path,
                                    session: session)
        let id = URL(fileURLWithPath: session).lastPathComponent
        try LaunchRequest.save(request, id: id)
        return Shell.quote(Sessions.runtime + "/agentctl") + " start " + Shell.quote(id)
    }
    public static func open(command: String, terminal: TerminalChoice) throws {
        // osascript argv transports data; user strings never enter AppleScript source.
        let source: String
        switch terminal {
        case .terminal: source = """
        on run argv
            tell application "Terminal"
                activate
                do script (item 1 of argv)
            end tell
        end run
        """
        case .iterm: source = """
        on run argv
            tell application "iTerm"
                activate
                set w to (create window with default profile)
                tell current session of w to write text (item 1 of argv)
            end tell
        end run
        """
        }
        try ProcessRunner.checked("/usr/bin/osascript", ["-e", source, command])
    }
}
