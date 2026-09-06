// swift-tools-version: 6.0
import PackageDescription
let package = Package(
    name: "AgentWorkbench", platforms: [.macOS(.v14)],
    products: [.executable(name: "AgentWorkbench", targets: ["AgentWorkbench"]), .executable(name: "agentctl", targets: ["agentctl"])],
    targets: [.target(name: "WorkbenchCore"), .executableTarget(name: "AgentWorkbench", dependencies: ["WorkbenchCore"]), .executableTarget(name: "agentctl", dependencies: ["WorkbenchCore"]), .testTarget(name: "WorkbenchCoreTests", dependencies: ["WorkbenchCore"])]
)
