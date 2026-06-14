{
  "targets": [
    {
      "target_name": "strict_lock",
      "defines": ["NAPI_VERSION=8"],
      "conditions": [
        ["OS=='mac'", {
          "sources": ["src/strict_lock.cc"],
          "libraries": [
            "-framework ApplicationServices",
            "-framework CoreGraphics",
            "-framework CoreFoundation"
          ],
          "cflags_cc!": [],
          "cflags_cc": ["-std=c++17"],
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15"
          }
        }],
        ["OS!='mac'", {
          "sources": ["src/noop.cc"]
        }]
      ]
    }
  ]
}
