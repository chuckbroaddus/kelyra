import AVKit
import ExpoModulesCore
import UIKit

public final class VolumeShutterModule: Module {
  private var interaction: Any?
  private var hostView: UIView?
  private var lastFire: CFTimeInterval = 0
  private let debounceSeconds: CFTimeInterval = 0.28

  public func definition() -> ModuleDefinition {
    Name("VolumeShutter")

    Events("onShutterPress")

    Function("isAvailable") { () -> Bool in
      if #available(iOS 17.2, *) {
        return true
      }
      return false
    }

    AsyncFunction("start") { () -> Bool in
      return try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.main.async {
          continuation.resume(returning: self.attach())
        }
      }
    }

    AsyncFunction("stop") {
      await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
        DispatchQueue.main.async {
          self.detach()
          continuation.resume()
        }
      }
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.detach()
      }
    }
  }

  @discardableResult
  private func attach() -> Bool {
    detach()
    guard #available(iOS 17.2, *) else {
      return false
    }
    guard let view = resolveHostView() else {
      return false
    }

    let interaction = AVCaptureEventInteraction(
      primary: { [weak self] event in
        self?.emitPress(event, source: "primary")
      },
      secondary: { [weak self] event in
        self?.emitPress(event, source: "secondary")
      }
    )
    interaction.isEnabled = true
    view.addInteraction(interaction)
    self.interaction = interaction
    self.hostView = view
    return true
  }

  private func detach() {
    if #available(iOS 17.2, *) {
      if let interaction = interaction as? AVCaptureEventInteraction, let hostView {
        hostView.removeInteraction(interaction)
      }
    }
    interaction = nil
    hostView = nil
  }

  private func resolveHostView() -> UIView? {
    if let vc = appContext?.utilities?.currentViewController() {
      return vc.view
    }
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    for scene in scenes {
      if let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
        return root.view
      }
    }
    return nil
  }

  @available(iOS 17.2, *)
  private func emitPress(_ event: AVCaptureEvent, source: String) {
    // Fire once per physical press on began (snappy, like Camera.app).
    guard event.phase == .began else {
      return
    }
    let now = CACurrentMediaTime()
    if now - lastFire < debounceSeconds {
      return
    }
    lastFire = now
    sendEvent("onShutterPress", [
      "source": source
    ])
  }
}
