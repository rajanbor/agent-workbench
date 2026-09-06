import SwiftUI
import AppKit
import WorkbenchCore
struct RepositoryView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var source = ""
    @State private var name = ""
    @State private var branch = "agent/"
    @State private var plan: RepositoryPlan?
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Create isolated workspace").font(.title2)
            HStack { TextField("Source repository", text: $source); Button("Choose…") { let panel = NSOpenPanel(); panel.canChooseFiles = false; panel.canChooseDirectories = true; if panel.runModal() == .OK, let url = panel.url { source = url.path; name = url.lastPathComponent + "-agent" } } }
            TextField("Workspace name", text: $name)
            TextField("Branch", text: $branch)
            if let plan { Text(plan.preview).font(.system(.caption, design: .monospaced)).textSelection(.enabled) }
            if let error { Text(error).foregroundStyle(.red).textSelection(.enabled) }
            HStack {
                Button("Cancel") { dismiss() }.disabled(busy)
                Spacer()
                if busy { ProgressView().controlSize(.small) }
                Button(plan == nil ? "Preview" : "Create workspace") {
                    if let plan {
                        busy = true; let workbench = model.workbench
                        Task {
                            do { try await Task.detached { try workbench.createRepository(plan) }.value; await model.refresh(); dismiss() }
                            catch { self.error = error.localizedDescription; self.plan = nil }
                            busy = false
                        }
                    } else {
                        do { plan = try model.workbench.planRepository(source: source, name: name, branch: branch); error = nil }
                        catch { self.error = error.localizedDescription }
                    }
                }.disabled(busy || source.isEmpty || name.isEmpty)
            }
        }.padding(24).frame(width: 650)
        .onChange(of: source) { plan = nil }.onChange(of: name) { plan = nil }.onChange(of: branch) { plan = nil }
    }
}
struct EnvironmentView: View {
    @Bindable var model: AppModel
    var project: Project
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var profile = AgentProfile.safe
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Environment · \(project.name)").font(.title2)
            Picker("Profile", selection: $profile) { ForEach(AgentProfile.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
            Text("Profiles are informational. Safe does not disable internet access.").font(.caption)
            Text("Non-secret variables only: NODE_ENV, PORT, TZ, LANG, LC_ALL, CI. One KEY=value per line. Stored as plain text.").font(.caption)
            TextEditor(text: $text).font(.system(.body, design: .monospaced)).frame(height: 160).border(.separator)
            if let error { Text(error).foregroundStyle(.red) }
            HStack { Button("Cancel") { dismiss() }; Spacer(); Button("Save") {
                do {
                    var values: [String: String] = [:]
                    for line in text.split(separator: "\n") {
                        let parts = line.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
                        guard parts.count == 2 else { throw WorkbenchError.invalid("Use KEY=value") }
                        values[String(parts[0])] = String(parts[1])
                    }
                    try WorkspaceValidation.environment(values)
                    guard let index = model.config.projects.firstIndex(where: { $0.id == project.id }) else { return }
                    model.config.projects[index].environment = values; model.config.projects[index].profile = profile
                    try model.workbench.store.save(model.config); dismiss()
                } catch { self.error = error.localizedDescription }
            } }
        }.padding(24).frame(width: 570)
        .onAppear { profile = project.profile; text = project.environment.sorted(by: { $0.key < $1.key }).map { "\($0.key)=\($0.value)" }.joined(separator: "\n") }
    }
}
