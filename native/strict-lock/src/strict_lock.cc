// macOS Cmd+Tab lockdown for Stretchly strict-mode breaks.
//
// A CGEventTap inserted at the HID level sees every key event system-wide
// before the Dock's app switcher does. While a strict break is active we
// swallow Cmd+Tab (and the Cmd+` window-cycle) by returning NULL from the
// callback, so the user cannot switch away / drop the fullscreen break out of
// its Space. The tap requires the app to be trusted for Accessibility; if it
// is not, CGEventTapCreate() returns NULL and install() reports false so the
// JS layer can prompt and log loudly instead of silently failing open.
//
// Written against the C node-api (node_api.h) directly — no node-addon-api —
// to avoid that header's incompatibility with the host clang.

#include <node_api.h>
#include <atomic>
#include <ApplicationServices/ApplicationServices.h>

namespace {

CFMachPortRef g_tap = nullptr;
CFRunLoopSourceRef g_source = nullptr;
std::atomic<bool> g_active{false};

// Virtual key codes (ANSI). Stable across layouts for these physical keys.
constexpr int64_t kVK_Tab = 48;
constexpr int64_t kVK_Grave = 50;  // ` / § — Cmd+` cycles windows of an app

CGEventRef TapCallback(CGEventTapProxy /*proxy*/, CGEventType type,
                       CGEventRef event, void* /*refcon*/) {
  // The system disables a tap if its callback is slow or on user input; just
  // re-enable and pass the event through.
  if (type == kCGEventTapDisabledByTimeout ||
      type == kCGEventTapDisabledByUserInput) {
    if (g_tap) CGEventTapEnable(g_tap, true);
    return event;
  }

  if (g_active.load(std::memory_order_relaxed) && type == kCGEventKeyDown) {
    const int64_t keycode =
        CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
    const CGEventFlags flags = CGEventGetFlags(event);
    const bool cmd = (flags & kCGEventFlagMaskCommand) != 0;
    // Cmd+Tab and Cmd+Shift+Tab share keycode 48; the Command check covers both.
    if (cmd && (keycode == kVK_Tab || keycode == kVK_Grave)) {
      return nullptr;  // swallow
    }
  }

  return event;
}

napi_value MakeBool(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

napi_value MakeUndefined(napi_env env) {
  napi_value result;
  napi_get_undefined(env, &result);
  return result;
}

// install() -> Boolean. Creates the tap and wires it into the main run loop.
// Returns true if the tap is live (Accessibility granted), false otherwise.
napi_value Install(napi_env env, napi_callback_info /*info*/) {
  if (g_tap) return MakeBool(env, true);

  const CGEventMask mask = CGEventMaskBit(kCGEventKeyDown);
  g_tap = CGEventTapCreate(kCGHIDEventTap, kCGHeadInsertEventTap,
                           kCGEventTapOptionDefault, mask, TapCallback, nullptr);
  if (!g_tap) {
    return MakeBool(env, false);  // not trusted for Accessibility
  }

  g_source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, g_tap, 0);
  CFRunLoopAddSource(CFRunLoopGetMain(), g_source, kCFRunLoopCommonModes);
  CGEventTapEnable(g_tap, true);
  return MakeBool(env, true);
}

// setActive(bool). Toggles whether the (already installed) tap swallows keys.
napi_value SetActive(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);

  bool active = false;
  if (argc >= 1) {
    napi_value coerced;
    if (napi_coerce_to_bool(env, argv[0], &coerced) == napi_ok) {
      napi_get_value_bool(env, coerced, &active);
    }
  }
  g_active.store(active, std::memory_order_relaxed);
  return MakeUndefined(env);
}

// isInstalled() -> Boolean.
napi_value IsInstalled(napi_env env, napi_callback_info /*info*/) {
  return MakeBool(env, g_tap != nullptr);
}

// uninstall(). Tears the tap down completely.
napi_value Uninstall(napi_env env, napi_callback_info /*info*/) {
  g_active.store(false, std::memory_order_relaxed);
  if (g_source) {
    CFRunLoopRemoveSource(CFRunLoopGetMain(), g_source, kCFRunLoopCommonModes);
    CFRelease(g_source);
    g_source = nullptr;
  }
  if (g_tap) {
    CGEventTapEnable(g_tap, false);
    CFRelease(g_tap);
    g_tap = nullptr;
  }
  return MakeUndefined(env);
}

void Define(napi_env env, napi_value exports, const char* name,
            napi_callback fn) {
  napi_value value;
  napi_create_function(env, name, NAPI_AUTO_LENGTH, fn, nullptr, &value);
  napi_set_named_property(env, exports, name, value);
}

napi_value Init(napi_env env, napi_value exports) {
  Define(env, exports, "install", Install);
  Define(env, exports, "uninstall", Uninstall);
  Define(env, exports, "setActive", SetActive);
  Define(env, exports, "isInstalled", IsInstalled);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
