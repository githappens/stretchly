// Non-macOS stub: the Cmd+Tab lockdown is macOS-only. install()/isInstalled()
// report false so the JS layer treats the lockdown as unavailable.
#include <node_api.h>

namespace {

napi_value False(napi_env env, napi_callback_info /*info*/) {
  napi_value result;
  napi_get_boolean(env, false, &result);
  return result;
}

napi_value Undef(napi_env env, napi_callback_info /*info*/) {
  napi_value result;
  napi_get_undefined(env, &result);
  return result;
}

void Define(napi_env env, napi_value exports, const char* name,
            napi_callback fn) {
  napi_value value;
  napi_create_function(env, name, NAPI_AUTO_LENGTH, fn, nullptr, &value);
  napi_set_named_property(env, exports, name, value);
}

napi_value Init(napi_env env, napi_value exports) {
  Define(env, exports, "install", False);
  Define(env, exports, "uninstall", Undef);
  Define(env, exports, "setActive", Undef);
  Define(env, exports, "isInstalled", False);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
