package com.sus

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class MedicationAlarmModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName(): String = "MedicationAlarmNative"
  @ReactMethod fun canUseFullScreenIntent(promise: Promise) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent())
  }
  @ReactMethod fun openFullScreenSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= 34) context.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
        Uri.parse("package:" + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(null)
    } catch (error: Exception) { promise.reject("FULL_SCREEN_SETTINGS", error) }
  }
  @ReactMethod fun finishAlarm(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = context.currentActivity
      if (activity is MedicationAlarmActivity) activity.finish()
      promise.resolve(null)
    }
  }
}
class MedicationAlarmPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(MedicationAlarmModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
