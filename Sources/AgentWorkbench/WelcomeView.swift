import SwiftUI

struct WelcomeView: View {
    @Bindable var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack(spacing: 14) {
                Image(systemName: "terminal.fill").font(.system(size: 32)).foregroundStyle(.tint)
                    .frame(width: 64, height: 64).background(.tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                VStack(alignment: .leading, spacing: 5) {
                    Text("Witaj w Agent Workbench").font(.title2.bold())
                    Text("Przygotuj Maca do pracy z agentami.").foregroundStyle(.secondary)
                }
            }
            ScrollView {
              VStack(alignment: .leading, spacing: 20) {
                step("1", title: "Skonfiguruj Maca", detail: "Konfigurator otworzy Terminal i poprowadzi przez konto agent, dostęp do projektów oraz instalację narzędzi. Nie musisz wpisywać komend.")
                Button("Skonfiguruj Maca…") { model.configureMac() }.buttonStyle(.borderedProminent).controlSize(.large)
                Divider()
                step("2", title: "Zaloguj swoje narzędzia", detail: "Po konfiguracji zaloguj się osobno do Codex i Claude na koncie agent. Każdy przycisk otworzy logowanie w Terminalu.")
                HStack {
                    Button("Zaloguj Codex") { model.login(.codex) }
                    Button("Zaloguj Claude") { model.login(.claude) }
                }.controlSize(.large)
                Divider()
                step("3", title: "Dodaj pierwszy projekt", detail: "Wybierz istniejący workspace albo utwórz izolowaną kopię zaufanego repozytorium.")
              }.frame(maxWidth: .infinity, alignment: .leading).padding(.trailing, 8)
            }
            Label("Hasła podajesz do macOS. Agent nie otrzymuje praw administratora.", systemImage: "lock")
                .font(.callout).foregroundStyle(.secondary)
            HStack {
                Button("Instrukcja i pomoc") { NSWorkspace.shared.open(URL(string: "https://rajanbor.github.io/agent-workbench/#instalacja")!) }
                Spacer()
                Button("Przejdź do projektów") {
                    UserDefaults.standard.set(true, forKey: "welcomeDismissed")
                    model.setup = false
                    Task { await model.refresh() }
                }.keyboardShortcut(.defaultAction)
            }
        }.padding(30).frame(width: 640, height: 620)
    }
    private func step(_ number: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number).font(.callout.bold()).frame(width: 26, height: 26)
                .background(.quaternary, in: Circle())
            VStack(alignment: .leading, spacing: 5) {
                Text(title).font(.headline)
                Text(detail).font(.callout).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
