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

struct GitHubImportView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var account: GitHubAccount?
    @State private var repositories: [GitHubRepository] = []
    @State private var selected: GitHubRepository?
    @State private var query = ""
    @State private var name = ""
    @State private var branch = "agent/"
    @State private var error: String?
    @State private var loading = false
    @State private var importing = false

    private var visibleRepositories: [GitHubRepository] {
        guard !query.isEmpty else { return repositories }
        return repositories.filter { $0.nameWithOwner.localizedCaseInsensitiveContains(query) || ($0.description?.localizedCaseInsensitiveContains(query) ?? false) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Dodaj z GitHub").font(.title2.weight(.semibold))
                    Text(account.map { "Połączono jako @\($0.login)" } ?? "Połącz konto, aby wybrać swoje repozytorium.")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Odśwież") { load() }.disabled(loading || importing)
            }
            if account == nil, !loading {
                ContentUnavailableView("GitHub nie jest jeszcze połączony", systemImage: "person.crop.circle.badge.checkmark", description: Text("Logowanie otworzy się w przeglądarce. Aplikacja nie zapisuje tokenu ani nie przekazuje go kontu agent."))
                HStack {
                    Button("Połącz GitHub…") { model.connectGitHub() }.buttonStyle(.borderedProminent)
                    Button("Pobierz GitHub CLI") { model.openGitHubCLI() }
                    Text("Po zalogowaniu wróć tutaj i wybierz Odśwież.").font(.caption).foregroundStyle(.secondary)
                }
            } else {
                TextField("Szukaj repozytorium", text: $query)
                List(visibleRepositories, selection: $selected) { repository in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack { Text(repository.nameWithOwner).fontWeight(.medium); if repository.isPrivate { Text("Prywatne").font(.caption).foregroundStyle(.secondary) } }
                        if let description = repository.description, !description.isEmpty { Text(description).lineLimit(1).font(.caption).foregroundStyle(.secondary) }
                    }.tag(repository)
                }.frame(height: 230)
                if selected != nil {
                    Divider()
                    Text("Nowy, izolowany workspace").font(.headline)
                    TextField("Nazwa folderu", text: $name)
                    TextField("Branch", text: $branch)
                    Text("Pobrana kopia służy tylko do importu. Agent dostaje oddzielną kopię bez zdalnego origin i bez danych logowania.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            if let error { Text(error).foregroundStyle(.red).textSelection(.enabled) }
            HStack {
                Button("Anuluj") { dismiss() }.disabled(importing)
                Spacer()
                if loading || importing { ProgressView().controlSize(.small) }
                Button("Dodaj repozytorium") { importRepository() }
                    .buttonStyle(.borderedProminent)
                    .disabled(selected == nil || name.isEmpty || branch == "agent/" || loading || importing)
            }
        }
        .padding(24).frame(width: 680, height: 570)
        .task { load() }
        .onChange(of: selected) { _, repository in
            if let repository { name = repository.name + "-agent"; branch = "agent/" + repository.name }
        }
    }

    private func load() {
        loading = true; error = nil
        Task {
            do {
                let result = try await Task.detached { (try GitHubAccess.account(), try GitHubAccess.repositories()) }.value
                account = result.0; repositories = result.1
            } catch { account = nil; repositories = []; self.error = error.localizedDescription }
            loading = false
        }
    }

    private func importRepository() {
        guard let selected else { return }
        importing = true; error = nil; let workbench = model.workbench; let workspaceName = name; let workspaceBranch = branch
        Task {
            do {
                try await Task.detached { try workbench.importGitHubRepository(selected, name: workspaceName, branch: workspaceBranch) }.value
                await model.refresh(); dismiss()
            } catch { self.error = error.localizedDescription }
            importing = false
        }
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
