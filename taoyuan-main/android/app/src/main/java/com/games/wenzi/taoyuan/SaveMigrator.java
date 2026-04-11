package com.games.wenzi.taoyuan;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import fi.iki.elonen.NanoHTTPD;

/**
 * 一次性存档迁移器：从旧版 http://localhost:8080 读取 localStorage，
 * 注入到 Capacitor 的 https://localhost WebView 中。
 */
public class SaveMigrator {

    private static final String TAG = "SaveMigrator";
    private static final String PREFS_NAME = "save_migration";
    private static final String KEY_DONE = "migration_done_v2";
    private static final int OLD_PORT = 8080;

    private final Context context;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MigrationServer server;
    private WebView hiddenWebView;
    private final ConcurrentHashMap<String, String> collectedSaves = new ConcurrentHashMap<>();
    private OnMigrationListener listener;
    private boolean finished = false;

    public interface OnMigrationListener {
        void onMigrationComplete(Map<String, String> saves);
        void onMigrationSkipped(String reason);
    }

    public SaveMigrator(Context context) {
        this.context = context;
    }

    /** 检查是否需要迁移 */
    public boolean needsMigration() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return !prefs.getBoolean(KEY_DONE, false);
    }

    /** 标记迁移完成 */
    public static void markDone(Context context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_DONE, true).apply();
    }

    /** 启动迁移流程 */
    public void migrate(OnMigrationListener listener) {
        this.listener = listener;

        if (!needsMigration()) {
            listener.onMigrationSkipped("已迁移过，跳过");
            return;
        }

        Log.d(TAG, "开始存档迁移...");
        showToast("正在检测旧版存档...");

        try {
            // 启动 NanoHTTPD，提供迁移页面
            server = new MigrationServer(OLD_PORT);
            server.start();
            Log.d(TAG, "迁移服务器启动在端口 " + OLD_PORT);

            // 创建隐藏 WebView 访问旧 origin
            handler.post(() -> {
                hiddenWebView = new WebView(context);
                WebSettings settings = hiddenWebView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);

                hiddenWebView.addJavascriptInterface(new MigrationBridge(), "MigrationBridge");
                hiddenWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        Log.d(TAG, "迁移页面加载完成: " + url);
                    }

                    @Override
                    public void onReceivedError(WebView view, int errorCode,
                                                String description, String failingUrl) {
                        Log.e(TAG, "迁移页面加载失败: " + description);
                        finish("页面加载失败: " + description);
                    }
                });

                hiddenWebView.loadUrl("http://localhost:" + OLD_PORT + "/migration");
            });

            // 10秒超时保护
            handler.postDelayed(() -> {
                if (!finished) {
                    Log.w(TAG, "迁移超时，跳过");
                    finish("迁移超时");
                }
            }, 10000);

        } catch (Exception e) {
            Log.e(TAG, "迁移启动失败", e);
            finish("服务器启动失败: " + e.getMessage());
        }
    }

    /** 完成迁移并清理资源 */
    private synchronized void finish(String skipReason) {
        if (finished) return;
        finished = true;
        cleanup();
        if (listener != null) {
            if (skipReason != null || collectedSaves.isEmpty()) {
                String reason = skipReason != null ? skipReason : "旧版本无存档数据";
                Log.d(TAG, "迁移跳过: " + reason);
                // 只有确认无数据时才标记完成，错误/超时不标记，下次启动重试
                if ("旧版本无存档数据".equals(reason)) {
                    markDone(context);
                }
                showToast("未发现旧版存档（" + reason + "）");
                listener.onMigrationSkipped(reason);
            } else {
                // 找到旧存档，但不在这里 markDone()
                // markDone 由 injectSaves 在真正注入成功后调用
                Log.d(TAG, "迁移成功，共 " + collectedSaves.size() + " 条存档");
                showToast("发现 " + collectedSaves.size() + " 个旧版存档，正在迁移...");
                listener.onMigrationComplete(collectedSaves);
            }
        }
    }

    /** 显示 Toast 提示 */
    private void showToast(String message) {
        handler.post(() -> Toast.makeText(context, message, Toast.LENGTH_LONG).show());
    }

    /** 清理资源 */
    public void cleanup() {
        if (server != null) {
            server.stop();
            server = null;
        }
        handler.post(() -> {
            if (hiddenWebView != null) {
                hiddenWebView.destroy();
                hiddenWebView = null;
            }
        });
    }

    /** NanoHTTPD 迁移服务器，只返回一个迁移 HTML 页面 */
    private static class MigrationServer extends NanoHTTPD {
        MigrationServer(int port) {
            super(port);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String html = "<!DOCTYPE html><html><body><script>"
                + "try {"
                + "  var saves = {};"
                + "  for (var i = 0; i < localStorage.length; i++) {"
                + "    var key = localStorage.key(i);"
                + "    if (key.indexOf('taoyuanxiang_save_') === 0) {"
                + "      saves[key] = localStorage.getItem(key);"
                + "    }"
                + "  }"
                + "  var keys = Object.keys(saves);"
                + "  if (keys.length === 0) {"
                + "    MigrationBridge.onNoData();"
                + "  } else {"
                + "    for (var j = 0; j < keys.length; j++) {"
                + "      MigrationBridge.onSaveData(keys[j], saves[keys[j]]);"
                + "    }"
                + "    MigrationBridge.onComplete(keys.length);"
                + "  }"
                + "} catch(e) {"
                + "  MigrationBridge.onError(e.message);"
                + "}"
                + "</script></body></html>";

            return newFixedLengthResponse(Response.Status.OK, "text/html", html);
        }
    }

    /** JS Bridge，接收旧 origin 的存档数据 */
    private class MigrationBridge {
        @JavascriptInterface
        public void onSaveData(String key, String value) {
            Log.d(TAG, "收到存档: " + key + " (" + value.length() + " 字符)");
            collectedSaves.put(key, value);
        }

        @JavascriptInterface
        public void onComplete(int count) {
            Log.d(TAG, "迁移读取完成，共 " + count + " 个存档");
            handler.post(() -> finish(null));
        }

        @JavascriptInterface
        public void onNoData() {
            Log.d(TAG, "旧 origin 无存档数据");
            handler.post(() -> finish("旧版本无存档数据"));
        }

        @JavascriptInterface
        public void onError(String message) {
            Log.e(TAG, "迁移 JS 错误: " + message);
            handler.post(() -> finish("JS错误: " + message));
        }
    }

    /**
     * 检查新版是否已有存档，没有才注入旧存档并刷新页面
     */
    public static void injectSaves(WebView webView, Map<String, String> saves, Context context) {
        if (saves == null || saves.isEmpty()) return;

        // 先检查新版 localStorage 是否已有存档
        webView.evaluateJavascript(
            "(function(){" +
            "  for(var i=0;i<localStorage.length;i++){" +
            "    if(localStorage.key(i).indexOf('taoyuanxiang_save_')===0) return 'has_data';" +
            "  }" +
            "  return 'empty';" +
            "})();",
            result -> {
                // evaluateJavascript 返回值带引号，如 "\"has_data\""
                if (result != null && result.contains("has_data")) {
                    Log.d(TAG, "新版已有存档，跳过迁移注入，避免覆盖");
                    new Handler(Looper.getMainLooper()).post(() ->
                        Toast.makeText(context, "新版已有存档，跳过旧版迁移", Toast.LENGTH_LONG).show()
                    );
                    return;
                }

                // 新版无存档，安全注入
                StringBuilder js = new StringBuilder("(function(){");
                for (Map.Entry<String, String> entry : saves.entrySet()) {
                    String key = escapeJs(entry.getKey());
                    String value = escapeJs(entry.getValue());
                    js.append("localStorage.setItem('").append(key).append("','").append(value).append("');");
                }
                js.append("location.reload();");
                js.append("})();");

                webView.evaluateJavascript(js.toString(), r -> {
                    Log.d(TAG, "存档注入完成，共 " + saves.size() + " 条，页面已刷新");
                    // 注入成功才标记完成，下次不再迁移
                    markDone(context);
                });
            }
        );
    }

    /** 转义 JS 单引号字符串中的特殊字符 */
    private static String escapeJs(String s) {
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
