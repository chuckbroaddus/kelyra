package expo.modules.volumeshutter

import android.view.KeyEvent
import android.view.View
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android: intercept volume key-up while armed so presses do not change system volume.
 * Attaches a key pre-IME listener on the activity decor view.
 */
class VolumeShutterModule : Module() {
  private var armed = false
  private var hostView: View? = null
  private var previousListener: View.OnKeyListener? = null
  private var lastFireMs: Long = 0
  private val debounceMs = 280L

  private val keyListener = View.OnKeyListener { _, keyCode, event ->
    if (!armed) return@OnKeyListener false
    if (keyCode != KeyEvent.KEYCODE_VOLUME_UP && keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {
      return@OnKeyListener false
    }
    if (event.action != KeyEvent.ACTION_DOWN || event.repeatCount != 0) {
      // Consume volume keys while armed so volume never changes.
      return@OnKeyListener true
    }
    val now = System.currentTimeMillis()
    if (now - lastFireMs >= debounceMs) {
      lastFireMs = now
      val source = if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) "secondary" else "primary"
      sendEvent("onShutterPress", mapOf("source" to source))
    }
    true
  }

  override fun definition() = ModuleDefinition {
    Name("VolumeShutter")

    Events("onShutterPress")

    Function("isAvailable") {
      true
    }

    AsyncFunction("start") {
      arm()
    }

    AsyncFunction("stop") {
      disarm()
    }

    OnDestroy {
      disarm()
    }
  }

  private fun arm(): Boolean {
    disarm()
    val activity = appContext.currentActivity ?: return false
    val decor = activity.window?.decorView ?: return false
    // Make decor focusable so it can receive key events when no text field is focused.
    decor.isFocusableInTouchMode = true
    decor.requestFocus()
    previousListener = null
    decor.setOnKeyListener(keyListener)
    hostView = decor
    armed = true
    return true
  }

  private fun disarm() {
    armed = false
    hostView?.setOnKeyListener(null)
    hostView = null
    previousListener = null
  }
}
