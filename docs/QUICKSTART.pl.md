# Agent Workbench — instalacja na macOS

Wersja alpha. Wymagany macOS 14+ i główne konto uprawnione do użycia sudo.
Konto agenta jest standardowe; nie otrzymuje uprawnień administratora.

## Najprościej: instalator macOS

1. Wejdź na [stronę aplikacji](https://rajanbor.github.io/agent-workbench/).
2. Kliknij **Pobierz na macOS**. Jeden plik `.pkg` działa na Apple Silicon i Intelu.
3. Otwórz pobrany plik i przejdź przez instalator macOS.
4. Otwórz Finder → **Aplikacje → Agent Workbench**.
5. Kliknij **Skonfiguruj Maca**. W Terminalu odpowiadaj na pytania — nie wpisujesz komend.
6. Wróć do aplikacji i użyj **Zaloguj Codex** / **Zaloguj Claude**.
7. Przejdź do projektów i dodaj pierwszy workspace.

Nie potrzebujesz Xcode ani ZIP-a. Instalator dodaje aplikację do `/Applications`;
nie tworzy kont ani nie uruchamia skryptów administratora. Aplikacja przy starcie
przygotowuje launcher dla Twojego głównego konta. Konfigurator osobno pyta o konto,
dostęp do workspace, ochronę HOME i instalację narzędzi. Pytania wymagają YES albo
INSTALL; odmowa nie jest zgodą na zmianę.

Jeśli masz poprzednią kopię w `~/Applications`, otwórz nową z `/Applications`.
Projekty i ustawienia są wspólne i zachowane. Pierwszą konfigurację możesz ponownie
otworzyć w Ustawieniach aplikacji.

[Wydanie, kod źródłowy i sumy SHA-256](https://github.com/rajanbor/agent-workbench/releases/tag/v0.1.0-alpha.2).

Hasło głównego konta podajesz do sudo. Przy tworzeniu konta macOS poprosi
osobno o nowe hasło dla użytkownika agent. Skrypty nie przechowują haseł.
Istniejący użytkownik agent zostanie zachowany bez zmiany hasła.

Aplikacja jest podpisana ad hoc, a instalator nie ma certyfikatu wydawcy ani
notaryzacji Apple. macOS może wymagać
świadomego wybrania „Otwórz mimo to” w Ustawieniach systemowych →
Prywatność i ochrona. Nie wyłączaj Gatekeepera. Przy pierwszym uruchomieniu
Terminala aplikacja może poprosić o zgodę na automatyzację.

## Alternatywnie: ze źródeł

Wymagany Swift 6 / Xcode 16+ albo zgodne Command Line Tools. Jeśli ich brakuje:

```sh
xcode-select --install
```

Zakończ instalację w oknie macOS. Następnie:

```sh
git clone --branch v0.1.0-alpha.2 https://github.com/rajanbor/agent-workbench.git
cd agent-workbench
bash scripts/quickstart.sh
```

## Komendy krok po kroku

Jeśli chcesz osobno przejrzeć każdy etap, zamiast quickstart wykonaj:

```sh
# Tylko przy instalacji ze źródeł:
bash scripts/build-app.sh

# Aplikacja w ~/Applications, CLI w ~/.local/bin:
bash scripts/install.sh --dry-run
bash scripts/install.sh

# Konto agent, workspace i opcjonalna ochrona HOME:
bash scripts/setup-macos.sh
bash scripts/setup-macos.sh --apply

# Node + narzędzia, wyłącznie w kontekście konta agent:
bash scripts/install-agent-tools.sh
bash scripts/install-agent-tools.sh --apply

open "$HOME/Applications/Agent Workbench.app"
```

Setup domyślnie tylko pokazuje plan. `--apply` pyta przed każdą zmianą.
Nie uruchamiaj całego konfiguratora przez sudo.

## Ręczne utworzenie użytkownika

Preferowany interfejs: Ustawienia systemowe → Użytkownicy i grupy →
Dodaj użytkownika → **Standardowy**, nazwa konta **agent**.

Odpowiednik terminalowy, tylko gdy konto nie istnieje:

```sh
id agent
# Jeżeli wynik mówi, że użytkownik nie istnieje:
sudo /usr/sbin/sysadminctl -addUser agent -fullName "Coding Agent" -home /Users/agent -shell /bin/zsh -password -
id agent
```

Myślnik po `-password` oznacza bezpieczne pytanie macOS; nie zastępuj go
hasłem wpisanym w komendzie. Nie dodawaj flagi `-admin`. Nie loguj tego
konta do iCloud. Pozostałe uprawnienia przygotuje `setup-macos.sh --apply`.

## Logowanie do narzędzi i pierwszy projekt

```sh
sudo -iu agent
codex login
claude
# Zakończ Claude, następnie:
exit
```

Zaloguj narzędzia osobno. Nie kopiuj konfiguracji, kluczy SSH ani sesji logowania
z głównego konta. Subskrypcje/API podlegają zasadom dostawców.

W aplikacji: Dodaj projekt → Izolowana kopia repozytorium → wybierz zaufane
źródło → sprawdź docelową ścieżkę i branch → utwórz.
Następnie wybierz Codex lub Claude.

```sh
~/.local/bin/agentctl list
~/.local/bin/agentctl codex nazwa-projektu
```

## Gdy start jest zablokowany

- **Unknown / authentication required:** w swoim Terminalu uruchom
  `sudo -v`, a potem `~/.local/bin/agentctl status`.
- **Dostęp do prywatnych katalogów:** ponownie uruchom konfigurator i wybierz
  ochronę HOME. Dodaje on ACL `user:agent deny list,search` tylko na Twoim
  głównym HOME. To zamyka agentowi dostęp do całego tego katalogu.
- **Codex/Claude missing:** uruchom instalator narzędzi, potem otwórz nową sesję.
- **Brak zapisu w starym projekcie:** setup nie zmienia rekursywnie istniejących
  plików. Utwórz nową izolowaną kopię repozytorium albo świadomie przejrzyj ACL.
- **Inny program agentctl już istnieje:** instalator zachowuje go. Korzystaj z
  `/Users/Shared/AgentWorkbench-<Twój UID>/agentctl` lub sam rozwiąż kolizję.

## Wycofanie zmian

Instalacja ze źródeł zachowuje poprzednią wersję aplikacji w wypisanym katalogu staging.
Instalator `.pkg` aktualizuje aplikację w `/Applications`; wcześniejsze wydania
pozostają do pobrania na GitHubie. Możesz przenieść aplikację do Kosza. Konfiguracja, projekty,
konto agent i narzędzia są zachowywane; nic nie kasuje ich automatycznie.
Konto usuń dopiero po zabezpieczeniu projektów, przez Ustawienia systemowe.

Aby cofnąć dokładnie ACL dodane przez setup na głównym HOME:

```sh
chmod -a "user:agent deny list,search" "$HOME"
```

To ponownie udostępnia agentowi pliki zgodnie z pozostałymi uprawnieniami.
Przeczytaj [model bezpieczeństwa](SECURITY.md).
