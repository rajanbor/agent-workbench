import SwiftUI
import AppKit
import WorkbenchCore

@MainActor @Observable final class AppModel {
    var config = Configuration()
    var selection: UUID?
    var section = "Projects"
    var message: String?
    var diagnostic = "Checking…"
    var git: [UUID: String] = [:]
    var busy = false
    var setup = false
    var creating = false
    var editing: Project?
    var privacyHelp = false
    var sessions: [UUID: [SessionRecord]] = [:]
    let workbench = Workbench()
    func reload() { do { config = try workbench.store.load(); if selection == nil { selection = config.projects.first?.id } } catch { message = error.localizedDescription } }
    func refresh() async {
        reload(); let configuration = config; let workbench = workbench
        let results = await Task.detached { (Diagnostics.report(configuration), configuration.projects.map { ($0.id, (try? workbench.gitStatus($0)) ?? "Git unavailable") }) }.value
        diagnostic = results.0; git = Dictionary(uniqueKeysWithValues: results.1)
        refreshSessions()
    }
    func launch(_ project: Project, _ action: LaunchAction) async {
        busy = true; defer { busy = false }; let workbench = workbench
        do { try await Task.detached { try workbench.launch(project, action: action) }.value; reload() } catch { message = error.localizedDescription }
    }
    func refreshSessions() { sessions = Dictionary(uniqueKeysWithValues: config.projects.map { ($0.id, Sessions.records(projectID: $0.id)) }) }
    func add() {
        let panel = NSOpenPanel(); panel.canChooseFiles = false; panel.canChooseDirectories = true
        panel.directoryURL = URL(fileURLWithPath: config.workspaceRoot)
        if panel.runModal() == .OK, let url = panel.url { do { try workbench.register(path: url.path); reload() } catch { message = error.localizedDescription } }
    }
    func save() { do { try workbench.store.save(config) } catch { message = error.localizedDescription } }
    func prepareRuntime() async {
        guard let resources = Bundle.main.resourceURL else { return }
        let script = resources.appendingPathComponent("Setup/prepare-runtime.sh").path
        let bundle = Bundle.main.bundleURL.path
        guard FileManager.default.fileExists(atPath: script) else { return } // swift run / development builds
        do { _ = try await Task.detached { try ProcessRunner.checked("/bin/bash", [script, bundle]) }.value }
        catch { message = error.localizedDescription }
    }
    func configureMac() {
        guard let resources = Bundle.main.resourceURL else { message = "Brak konfiguratora w aplikacji."; return }
        let script = resources.appendingPathComponent("Setup/configure-macos.sh").path
        openSetupTerminal("/bin/bash " + Shell.quote(script))
    }
    func login(_ action: LaunchAction) {
        do {
            let identity = try AgentIdentity.inspect(config.agentUser)
            let command = action == .codex ? "codex login" : "claude"
            let args = ["/usr/bin/sudo", "-iu", "agent", "/usr/bin/env", "-i", "HOME=\(identity.home)", "USER=agent", "LOGNAME=agent", "TERM=xterm-256color", "PATH=\(identity.home)/.local/node/bin:\(identity.home)/.local/npm/bin:\(identity.home)/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "/bin/zsh", "-lc", command]
            openSetupTerminal(args.map(Shell.quote).joined(separator: " "))
        } catch { message = error.localizedDescription }
    }
    private func openSetupTerminal(_ command: String) {
        let terminal = config.terminal
        Task {
            do { try await Task.detached { try Launcher.open(command: command, terminal: terminal) }.value }
            catch { message = error.localizedDescription }
        }
    }
}
@main struct AgentWorkbenchApp: App {
    @State private var model = AppModel()
    var body: some Scene {
        WindowGroup("Agent Workbench") { MainView(model: model).frame(minWidth: 940, minHeight: 660).task {
            await model.prepareRuntime()
            await model.refresh()
            model.setup = !UserDefaults.standard.bool(forKey: "welcomeDismissed") || !FileManager.default.fileExists(atPath: Sessions.runtime + "/agentctl")
        } }
        Settings { SettingsView(model: model).frame(width: 650, height: 530).padding() }
    }
}
struct MainView: View {
    @Bindable var model: AppModel
    var body: some View {
        NavigationSplitView {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image(systemName: "terminal.fill").font(.title2).foregroundStyle(.tint)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Agent Workbench").font(.headline)
                        Text("Lokalne środowisko pracy").font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                }.padding(.horizontal, 16).padding(.vertical, 22)
                List(selection: $model.section) {
                    Section("WORKSPACE") {
                        Label("Projekty", systemImage: "folder").tag("Projects")
                        Label("Agenci", systemImage: "terminal").tag("Agents")
                    }
                    Section { Label("Ustawienia", systemImage: "slider.horizontal.3").tag("Settings") }
                }.listStyle(.sidebar)
                HStack(spacing: 7) { Image(systemName: "person.crop.circle"); Text("Konto: agent"); Spacer(); Text("Lokalnie").font(.caption2) }
                    .font(.caption).foregroundStyle(.secondary).padding(16)
            }.navigationSplitViewColumnWidth(min: 210, ideal: 230, max: 270)
        } detail: {
            Group {
                if model.section == "Settings" { SettingsView(model: model) }
                else if model.section == "Agents" { AgentsView(model: model) }
                else { ProjectsView(model: model) }
            }.navigationTitle("")
        }
        .task { while !Task.isCancelled { model.refreshSessions(); try? await Task.sleep(for: .seconds(2)) } }
        .sheet(isPresented: $model.privacyHelp) { PrivacyHelpView() }
        .sheet(isPresented: $model.creating) { RepositoryView(model: model) }
        .sheet(item: $model.editing) { project in EnvironmentView(model: model, project: project) }
        .alert("Agent Workbench", isPresented: Binding(get: { model.message != nil }, set: { if !$0 { model.message = nil } })) { Button("OK") { model.message = nil } } message: { Text(model.message ?? "") }
        .sheet(isPresented: $model.setup) {
            WelcomeView(model: model)
        }
    }
}
struct ProjectsView: View {
    @Bindable var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Projekty").font(.largeTitle.weight(.semibold))
                    Text("\(model.config.projects.count) projektów · oddzielne konto macOS").foregroundStyle(.secondary)
                }
                Spacer()
                Button { Task { await model.refresh() } } label: { Image(systemName: "arrow.clockwise") }.help("Odśwież status")
                Menu {
                    Button("Istniejący workspace…") { model.add() }
                    Button("Izolowana kopia repozytorium…") { model.creating = true }
                } label: { Label("Dodaj projekt", systemImage: "plus") }.menuStyle(.borderlessButton).fixedSize().padding(.leading, 10)
            }.padding(24)
            if model.config.projects.isEmpty {
                ContentUnavailableView("Miejsce na Twój pierwszy projekt", systemImage: "folder.badge.plus", description: Text("Dodaj katalog z AgentWork lub utwórz izolowaną kopię repozytorium."))
            } else {
                Table(model.config.projects, selection: $model.selection) {
                    TableColumn("Projekt") { project in
                        HStack(spacing: 10) {
                            Image(systemName: "folder.fill").foregroundStyle(.tint)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(project.name).fontWeight(.medium)
                                Text(project.path).font(.caption).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle)
                            }.padding(.vertical, 6)
                        }
                    }.width(min: 200, ideal: 280)
                    TableColumn("Git") { project in
                        let status = model.git[project.id] ?? ""
                        Text(status.hasPrefix("##") ? String(status.components(separatedBy: "\n")[0].dropFirst(3)) : "Niezweryfikowany")
                            .font(.callout).foregroundStyle(.secondary)
                    }
                    TableColumn("Sesja") { project in
                        let latest = model.sessions[project.id]?.first
                        if let latest { StatusBadge(state: Sessions.state(latest)) } else { Text("Gotowy do startu").font(.caption).foregroundStyle(.secondary) }
                    }.width(150)
                }.frame(minHeight: 130, idealHeight: 180, maxHeight: 240)
                Divider()
                if let project = model.config.projects.first(where: { $0.id == model.selection }) {
                    ProjectDetail(model: model, project: project)
                } else { ContentUnavailableView("Wybierz projekt", systemImage: "cursorarrow", description: Text("Narzędzia i ostatnie sesje pojawią się tutaj.")) }
            }
        }
    }
}
struct StatusBadge: View {
    let state: String
    var failed: Bool { state.hasPrefix("Failed:") }
    var running: Bool { state.hasPrefix("Running") }
    var text: String {
        if failed { return "Wymaga uwagi" }
        if running { return "Uruchomiony" }
        if state.hasPrefix("Awaiting") { return "Czeka na hasło" }
        if state.hasPrefix("Stopping") { return "Zatrzymywanie" }
        if state == "Stopped" { return "Zatrzymany" }
        if state == "Finished" || state.hasPrefix("Exited") { return "Zakończony" }
        return "Nieaktywny"
    }
    var body: some View {
        HStack(spacing: 5) { Image(systemName: failed ? "exclamationmark.circle.fill" : running ? "circle.fill" : "circle").font(.system(size: running ? 6 : 10)); Text(text) }
            .font(.caption.weight(.medium)).foregroundStyle(failed ? Color.orange : running ? Color.green : Color.secondary)
            .padding(.horizontal, 8).padding(.vertical, 5)
            .background((failed ? Color.orange : running ? Color.green : Color.secondary).opacity(0.09), in: Capsule())
    }
}
struct ProjectDetail: View {
    @Bindable var model: AppModel
    let project: Project
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(project.name).font(.title2.weight(.semibold))
                        Text(project.path).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
                    }
                    Spacer()
                    Button { model.editing = project } label: { Image(systemName: "slider.horizontal.3") }.help("Zmienne środowiskowe i profil")
                }
                HStack(spacing: 10) {
                    Button { Task { await model.launch(project, .codex) } } label: { Label("Uruchom Codex", systemImage: "terminal") }.buttonStyle(.borderedProminent)
                    Button { Task { await model.launch(project, .claude) } } label: { Label("Uruchom Claude", systemImage: "sparkle") }.buttonStyle(.bordered)
                    Button("Terminal") { Task { await model.launch(project, .terminal) } }
                    Spacer()
                    Menu {
                        Button("Pokaż w Finderze") {
                            do { let path = try WorkspaceValidation.project(project.path, root: model.config.workspaceRoot); NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)]) }
                            catch { model.message = error.localizedDescription }
                        }
                        Button("Git status") { model.message = model.git[project.id] ?? "Status wymaga uwierzytelnienia konta agent." }
                    } label: { Image(systemName: "ellipsis") }.fixedSize()
                }.controlSize(.large).disabled(model.busy)
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "person.badge.key").foregroundStyle(.secondary)
                    Text("Terminal może poprosić o Twoje hasło logowania, aby przełączyć się na konto agent. Hasła nie otrzymuje aplikacja ani agent.").font(.caption).foregroundStyle(.secondary)
                }
                Divider()
                HStack { Text("OSTATNIE SESJE").font(.caption.weight(.semibold)).foregroundStyle(.secondary); Spacer(); Text(project.lastLaunch?.formatted(date: .abbreviated, time: .shortened) ?? "Jeszcze nie uruchamiano").font(.caption).foregroundStyle(.tertiary) }
                if (model.sessions[project.id] ?? []).isEmpty {
                    Text("Wybierz agenta, aby rozpocząć pracę w tym projekcie.").font(.callout).foregroundStyle(.secondary)
                }
                ForEach(Array((model.sessions[project.id] ?? []).prefix(3))) { session in
                    let state = Sessions.state(session)
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Image(systemName: "terminal").foregroundStyle(.secondary)
                            Text(session.action.capitalized).fontWeight(.medium)
                            Text(session.created.formatted(date: .omitted, time: .shortened)).font(.caption).foregroundStyle(.secondary)
                            Spacer(); StatusBadge(state: state)
                            if state.hasPrefix("Running") {
                                Button("Zatrzymaj") { do { try Sessions.stop(session) } catch { model.message = error.localizedDescription } }
                            }
                        }
                        if state.hasPrefix("Failed:") {
                            Text(String(state.dropFirst(7))).font(.callout).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
                                .padding(12).background(Color.orange.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
                            if state.contains("private directories") { Button("Jak zabezpieczyć katalog domowy?") { model.privacyHelp = true } }
                        }
                    }
                }
                Text("Profil \(project.profile.rawValue) jest informacyjny — nie blokuje internetu. Lando: nie sprawdzano.").font(.caption).foregroundStyle(.tertiary)
            }.padding(24)
        }
    }
}
struct AgentsView: View {
    @Bindable var model: AppModel
    var body: some View {
        Form {
            Section {
                Text("Agenci").font(.largeTitle.weight(.semibold))
                Text("Narzędzia uruchamiane na oddzielnym koncie macOS.").foregroundStyle(.secondary)
            }
            Section("Dostęp do narzędzi") {
                LabeledContent("Codex", value: "Konto agent")
                LabeledContent("Claude Code", value: "Konto agent")
                Text("Instalacja i logowanie do narzędzi odbywają się osobno na koncie agent.").font(.caption).foregroundStyle(.secondary)
                HStack {
                    Button("Skonfiguruj Maca") { model.configureMac() }
                    Button("Zaloguj Codex") { model.login(.codex) }
                    Button("Zaloguj Claude") { model.login(.claude) }
                }
            }
            Section("Diagnostyka") {
                Text(model.diagnostic.contains("authentication required") ? "Wymagane uwierzytelnienie w Terminalu. Status narzędzi nie został jeszcze potwierdzony." : "Wyniki sprawdzenia środowiska są dostępne poniżej.")
                DisclosureGroup("Pokaż szczegóły") { Text(model.diagnostic).font(.caption.monospaced()).textSelection(.enabled) }
                Button("Sprawdź ponownie") { Task { await model.refresh() } }
            }
            Section { DisclosureGroup("Instrukcje instalacji") { Text(Diagnostics.installation).font(.caption.monospaced()).textSelection(.enabled) } }
        }.formStyle(.grouped)
    }
}
struct SettingsView: View {
    @Bindable var model: AppModel
    var body: some View {
        Form {
            Section { Text("Ustawienia").font(.largeTitle.weight(.semibold)); Text("Lokalna konfiguracja Agent Workbench.").foregroundStyle(.secondary) }
            Section("Środowisko") {
                Button("Otwórz pierwszą konfigurację") { model.setup = true }
                LabeledContent("Workspace", value: model.config.workspaceRoot)
                LabeledContent("Użytkownik macOS", value: model.config.agentUser)
                Picker("Aplikacja terminalowa", selection: $model.config.terminal) { ForEach(TerminalChoice.allCases, id: \.self) { Text($0.rawValue).tag($0) } }.onChange(of: model.config.terminal) { model.save() }
            }
            Section("Przełączanie konta") {
                Label("Hasło trafia bezpośrednio do sudo w Terminalu.", systemImage: "lock")
                Text("Aplikacja nie zapisuje hasła i nie nadaje agentowi praw administratora. Dostęp do prywatnych katalogów jest sprawdzany przed startem.").font(.callout).foregroundStyle(.secondary)
            }
            Section("Diagnostyka bezpieczeństwa") {
                DisclosureGroup("Szczegółowy raport") { Text(model.diagnostic).font(.caption.monospaced()).textSelection(.enabled) }
                Button("Odśwież diagnostykę") { Task { await model.refresh() } }
            }
            Section("Profile") { Text("Safe i Network opisują intencję pracy. Nie wymuszają izolacji sieciowej. Uprawnienia konta macOS określają rzeczywisty dostęp do plików.").font(.caption).foregroundStyle(.secondary) }
        }.formStyle(.grouped)
    }
}
struct PrivacyHelpView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Label("Dostęp do katalogu domowego", systemImage: "folder.badge.person.crop").font(.title2.weight(.semibold))
            Text("Jeśli agent widzi prywatne katalogi, możesz zabronić wyłącznie temu kontu przeglądania i otwierania plików w Twoim HOME.")
            Text("Uruchom na swoim głównym koncie, w zwykłym Terminalu:").font(.callout).foregroundStyle(.secondary)
            Text("chmod +a \"user:agent deny list,search\" \"$HOME\"").font(.body.monospaced()).textSelection(.enabled).padding(12).background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
            Text("To zamknie agentowi dostęp do całego Twojego HOME, również do projektów w tym katalogu. Projekty agentów i launcher znajdują się w /Users/Shared. Zmiana nie jest wykonywana automatycznie przez aplikację.").font(.callout).foregroundStyle(.secondary)
            DisclosureGroup("Jak cofnąć tę zmianę") {
                Text("chmod -a \"user:agent deny list,search\" \"$HOME\"").font(.caption.monospaced()).textSelection(.enabled)
            }
            HStack { Spacer(); Button("Rozumiem") { dismiss() }.buttonStyle(.borderedProminent) }
        }.padding(28).frame(width: 610)
    }
}
