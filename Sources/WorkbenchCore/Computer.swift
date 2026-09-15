import Foundation
import Darwin

public enum ComputerKind: String, Sendable { case laptop, desktop }

public struct ComputerProfile: Sendable, Equatable {
    public let kind: ComputerKind
    public let model: String
    public let chip: String
    public let memoryBytes: UInt64
    public let cores: Int
    public let freeStorageBytes: UInt64
    public let systemVersion: String

    public var memoryGB: Int { Int(memoryBytes / 1_073_741_824) }
    public var freeStorageGB: Int { Int(freeStorageBytes / 1_073_741_824) }
    public var icon: String { kind == .laptop ? "laptopcomputer" : "desktopcomputer" }

    public static func inspect() -> ComputerProfile {
        let model = value("hw.model") ?? "Mac"
        let chip = value("machdep.cpu.brand_string") ?? "Apple silicon"
        let memory = UInt64(value("hw.memsize") ?? "0") ?? 0
        let cores = Int(value("hw.ncpu") ?? "0") ?? 0
        let storage = (try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())[.systemFreeSize] as? NSNumber)?.uint64Value ?? 0
        let version = ProcessInfo.processInfo.operatingSystemVersionString
        return ComputerProfile(kind: model.localizedCaseInsensitiveContains("MacBook") ? .laptop : .desktop,
                               model: model, chip: chip, memoryBytes: memory, cores: cores,
                               freeStorageBytes: storage, systemVersion: version)
    }

    private static func value(_ name: String) -> String? {
        guard let output = try? ProcessRunner.checked("/usr/sbin/sysctl", ["-n", name]) else { return nil }
        let value = output.trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

public struct LocalModel: Identifiable, Sendable, Equatable {
    public let id: String
    public let name: String
    public let family: String
    public let parameters: String
    public let estimatedMemoryGB: Int
    public let downloadGB: Double
    public let description: String

    public static let catalog: [LocalModel] = [
        .init(id: "qwen-2.5-3b", name: "Qwen 2.5 3B", family: "Qwen", parameters: "3B", estimatedMemoryGB: 5, downloadGB: 2.0, description: "Lekki asystent do codziennych zadań."),
        .init(id: "llama-3.2-3b", name: "Llama 3.2 3B", family: "Llama", parameters: "3B", estimatedMemoryGB: 5, downloadGB: 2.0, description: "Kompaktowy model ogólnego zastosowania."),
        .init(id: "mistral-7b", name: "Mistral 7B", family: "Mistral", parameters: "7B", estimatedMemoryGB: 9, downloadGB: 4.1, description: "Sprawdzony model do rozmów i tekstu."),
        .init(id: "qwen-2.5-7b", name: "Qwen 2.5 7B", family: "Qwen", parameters: "7B", estimatedMemoryGB: 9, downloadGB: 4.7, description: "Uniwersalny model lokalny."),
        .init(id: "llama-3.1-8b", name: "Llama 3.1 8B", family: "Llama", parameters: "8B", estimatedMemoryGB: 10, downloadGB: 4.9, description: "Lepsza jakość odpowiedzi kosztem pamięci."),
        .init(id: "qwen-2.5-14b", name: "Qwen 2.5 14B", family: "Qwen", parameters: "14B", estimatedMemoryGB: 18, downloadGB: 9.0, description: "Model do bardziej wymagających zadań."),
        .init(id: "mixtral-8x7b", name: "Mixtral 8×7B", family: "Mistral", parameters: "46.7B MoE", estimatedMemoryGB: 30, downloadGB: 26.0, description: "Duży model wymagający dużo wspólnej pamięci.")
    ]

    public func fits(on profile: ComputerProfile) -> Bool {
        profile.memoryGB >= estimatedMemoryGB && profile.freeStorageGB >= Int(downloadGB.rounded(.up)) + 4
    }
}
