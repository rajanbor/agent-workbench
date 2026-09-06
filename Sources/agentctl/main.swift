import Foundation
import WorkbenchCore

@main struct AgentCTL {
    static func main() {
        do { try execute() } catch { FileHandle.standardError.write(Data("agentctl: \(error.localizedDescription)\n".utf8)); exit(1) }
    }
    static func execute() throws {
        let args = Array(CommandLine.arguments.dropFirst())
        if args.first == "__run" {
            guard args.count == 2 else { throw WorkbenchError.invalid("Invalid launch request") }
            try LaunchRequest.load(args[1]).runAsAgent(); return
        }
        if args.first == "start" {
            guard args.count == 2 else { throw WorkbenchError.invalid("Specify a launch request ID") }
            try LaunchRequest.start(id: args[1]); return
        }
        let workbench = Workbench(); let config = try workbench.store.load()
        guard let command = args.first else { print("agentctl list | status | open NAME | codex NAME | claude NAME | git NAME | add PATH | remove NAME | sessions NAME | stop NAME | setup"); return }
        switch command {
        case "__session":
            guard args.count == 6, let uid = UInt32(args[3]), let action = LaunchAction(rawValue: args[4]) else { throw WorkbenchError.invalid("Invalid supervisor invocation") }
            try ProcessRunner.supervise(project: args[1], root: args[2], uid: uid, action: action, session: args[5])

        case "list": for p in config.projects { print("\(p.name)\t\(p.path)\t\(p.lastLaunch?.formatted() ?? "Never")") }
        case "status": print(Diagnostics.report(config))
        case "setup": print(Diagnostics.report(config)); print(Diagnostics.installation)
        case "add":
            guard args.count == 2 else { throw WorkbenchError.invalid("Usage: agentctl add PATH") }
            if (try? WorkspaceValidation.project(args[1], root: config.workspaceRoot)) != nil {
                try workbench.register(path: args[1]); print("Project registered")
            } else {
                print("Workspace name:"); guard let name = readLine() else { return }
                print("Branch (agent/…):"); guard let branch = readLine() else { return }
                let plan = try workbench.planRepository(source: args[1], name: name, branch: branch)
                print(plan.preview + "\nType CREATE to continue:")
                guard readLine() == "CREATE" else { print("Cancelled"); return }
                try workbench.createRepository(plan); print("Workspace created")
            }
        case "open", "codex", "claude", "git", "remove", "stop", "sessions":
            guard args.count == 2, let project = config.projects.first(where: { $0.name == args[1] }) else { throw WorkbenchError.invalid("Specify a registered project name; see agentctl list") }
            if command == "sessions" { for record in Sessions.records(projectID: project.id) { print("\(record.action): \(Sessions.state(record))") } }
            else if command == "stop" { for record in Sessions.records(projectID: project.id) where Sessions.state(record).hasPrefix("Running") { try Sessions.stop(record) } }
            else if command == "git" { print(try workbench.gitStatus(project)) }
            else if command == "remove" {
                print("Remove \(project.name) from AgentWork and archive its files locally? Source repository stays untouched. Type REMOVE:")
                guard readLine() == "REMOVE" else { print("Cancelled"); return }; print("Archived at: " + (try workbench.archiveWorkspace(project)))
            } else { try workbench.launch(project, action: command == "open" ? .terminal : LaunchAction(rawValue: command)!) }
        default: throw WorkbenchError.invalid("Unknown command: \(command)")
        }
    }
}
