# Windows ↔ Ubuntu Build Workflow — play/

This is the standing process for building `play` locally. It differs from
PataSkillsV2's workflow in a few real, deliberate ways (noted inline) —
don't copy PataSkillsV2's doc verbatim for this project.

## Critical context — read this first

**`play` shares PataSkillsV2's app identity.** This is not a separate app.
It is built with:
- The same Android package: `com.pataskills.v2`
- The same signing keystore: `@tonymkay__pataskills-v2.jks` (copied from
  PataSkillsV2, not generated fresh for `play`)
- The same Play Store listing — a `.aab` built here is an **update** to
  the existing published app, not a new listing

Never generate a fresh keystore for `play`. If `android/app/` doesn't have
`@tonymkay__pataskills-v2.jks` in it, copy it from PataSkillsV2 — do not
run `keytool -genkeypair`.

**Repo name doesn't match the folder name.** The local folder is `play`
(`PataProducts/play`), but the GitHub repo is `PataSkills_Web`
(`https://github.com/tonymkay/PataSkills_Web.git`). Don't let that trip up
a `git remote`/clone command.

## Paths

| | Path |
|---|---|
| Windows (source of truth, all editing) | `C:\Users\LENOVO\Desktop\platform\PataProducts\play` |
| WSL/Ubuntu (build only) | `~/play` |
| GitHub | `https://github.com/tonymkay/PataSkills_Web.git` |
| Android SDK (WSL) | `~/android-sdk` |
| Node (WSL, via nvm) | `~/.nvm/versions/node/v24.18.0/bin` |

## Why two machines

Same reasoning as PataSkillsV2: Windows edits and pushes; Ubuntu pulls and
builds with `gradlew` (unlimited, free, unlike EAS's metered cloud
builds). Windows never builds. Ubuntu never originates code changes.

## What must be true before building — checklist

Run through this before any `gradlew` build. Skipping any of these
produces a build that compiles fine and fails somewhere less obvious
later (wrong signature, wrong version, dead OTA channel).

1. **`android/app/@tonymkay__pataskills-v2.jks` exists** — copied from
   PataSkillsV2, not generated.
2. **`android/app/keystore.properties` exists** and points at that file:
   ```
   storeFile=@tonymkay__pataskills-v2.jks
   storePassword=<PataSkillsV2's password>
   keyAlias=<PataSkillsV2's alias>
   keyPassword=<PataSkillsV2's password>
   ```
3. **`android/app/build.gradle` has the release signing block** (see
   below) — not left on `signingConfig signingConfigs.debug` for release.
4. **`versionCode` in `build.gradle` is higher than whatever's live** on
   the target Play Console track — check Play Console's release page, not
   just the file, since the file can lag behind a manual Play Console
   change.
5. **`AndroidManifest.xml`'s channel meta-data matches intent** — `preview`
   for testing, `production` only right before a real Play Store build
   (same channel-flip mechanics as PataSkillsV2 — see Quick Reference).
6. **WSL's `node_modules` matches Windows' `package.json`** — if a
   dependency was added/changed on Windows since the last WSL build, `npm
   install` is required on WSL first (see "Where play/ diverges from
   PataSkillsV2" below).
7. **`android/` on WSL actually matches Windows** — if you ran `expo
   prebuild` or edited any native file on Windows since the last sync,
   resync (`rm -rf ~/play/android && cp -r` from Windows, see Quick
   Reference).

## The four things `expo prebuild --clean` wipes, every time

Unlike PataSkillsV2 (which avoids `prebuild` entirely — see below), `play`
routinely regenerates `android/` from scratch via `npx expo prebuild
--clean` whenever `app.json`'s native config (icon, splash, plugins,
package name) changes. Every single time this runs, these four things are
gone and must be reapplied on Windows before the next build:

1. **Release signing block in `android/app/build.gradle`** — add right
   after `def jscFlavor = ...`:
   ```gradle
   def keystorePropertiesFile = file('keystore.properties')
   def keystoreProperties = new Properties()
   def keystoreConfigured = keystorePropertiesFile.exists()
   if (keystoreConfigured) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```
   Inside `signingConfigs`, add alongside `debug`:
   ```gradle
   if (keystoreConfigured) {
       release {
           storeFile file(keystoreProperties['storeFile'])
           storePassword keystoreProperties['storePassword']
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
       }
   }
   ```
   And change `buildTypes.release.signingConfig` from
   `signingConfigs.debug` to:
   ```gradle
   signingConfig keystoreConfigured ? signingConfigs.release : signingConfigs.debug
   ```
   This pattern falls back to debug-signing if `keystore.properties` is
   ever missing, so the build never hard-fails — it just won't be
   Play-Store-signable until the properties file is back.
2. **`android/app/keystore.properties`** — gone entirely, rewrite it
   (content above).
3. **`android/app/@tonymkay__pataskills-v2.jks`** — the actual keystore
   file is gone too (`prebuild --clean` wipes the whole `android/app/`
   directory). Copy it fresh from PataSkillsV2:
   ```powershell
   Copy-Item "C:\Users\LENOVO\Desktop\platform\PataSkillsV2\android\app\@tonymkay__pataskills-v2.jks" "C:\Users\LENOVO\Desktop\platform\PataProducts\play\android\app\@tonymkay__pataskills-v2.jks"
   ```
4. **Channel meta-data in `AndroidManifest.xml`** — `prebuild` never
   generates these three lines; add them after the `EXPO_UPDATE_URL`
   line:
   ```xml
   <meta-data android:name="expo.modules.updates.EXPO_RELEASE_CHANNEL" android:value="preview"/>
   <meta-data android:name="expo-channel-name" android:value="preview"/>
   <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;preview&quot;}"/>
   ```
   Also gone: `versionCode`/`versionName` reset to `1`/`"1.0.0"` in
   `build.gradle`'s `defaultConfig` — bump these back too (checklist item
   4 above).

`app.json`'s own fields (`name`, `package`, `runtimeVersion`, `plugins`,
etc.) are git-tracked and survive `prebuild` fine — only the generated
`android/` folder's contents get wiped.

## Where `play/` diverges from PataSkillsV2 — read before assuming either doc

| | PataSkillsV2 | `play` |
|---|---|---|
| `npx expo prebuild` | **Never** — would destroy hand-tuned native setup | **Routine** — the normal way to apply native config changes |
| `npm install` on Ubuntu | **Never** — "just in case" installs have shifted dependency resolution before | **Required whenever `package.json` changed on Windows** — a new dependency (e.g. `react-native-purchases`) won't be linked into the native build otherwise, and `gradlew` fails obscurely |
| Signing key | Own dedicated keystore | **Borrowed from PataSkillsV2** — same file, same Play Store listing |
| `runtimeVersion` | Fixed string, bumped manually for every native change | Same fixed-string approach — check `app.json` for the current value before a native-touching build |

Don't apply PataSkillsV2's "never prebuild" / "never npm install" rules to
`play` — they're deliberately different projects for different reasons
(PataSkillsV2 is older and has accumulated hand-tuned native config not
worth losing; `play` doesn't yet, so `prebuild --clean` is a safe reset).

## WSL non-interactive shell gotchas

Only relevant when running commands **non-interactively** (scripts, an
automation tool, `wsl -e bash -c "..."` from Windows) — an ordinary
interactive WSL terminal session already has these set via `~/.bashrc`
and won't hit this.

- **`node`/`npm` aren't on `PATH`** in a non-interactive/non-login shell —
  `.bashrc`'s nvm-sourcing lines are typically guarded behind an
  interactive-shell check that a plain `bash -c "..."` never satisfies.
  Fix: explicitly prepend the nvm bin dir:
  ```bash
  export PATH=/home/tonymkay/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin
  ```
- **`ANDROID_HOME` is empty** for the same reason — `.bashrc` sets it, but
  a non-interactive shell never sources it. Fix:
  ```bash
  export ANDROID_HOME=/home/tonymkay/android-sdk
  export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
  ```
  Without this, `gradlew`'s `settings.gradle` script (which shells out to
  `node`) fails with `Process 'command 'node'' finished with non-zero exit
  value 1` even when the actual cause is a missing `node`, not missing
  `node_modules` — check which one it actually is before assuming
  `npm install` is the fix.
- **If invoking WSL from Windows PowerShell** (e.g. `wsl -e bash -c
  "..."`), use **single quotes**, not double quotes, around the bash
  script. PowerShell expands `$` inside double-quoted strings before WSL
  ever sees them — `$PATH:$ANDROID_HOME` inside a double-quoted string
  breaks with a PowerShell parse error before reaching bash at all.

## The flow, step by step

1. **Edit on Windows.** Any native-config change (icon, splash, plugins,
   package name) → run `npx expo prebuild --clean` here first.
2. **Reapply the four wiped things** (signing block, `keystore.properties`,
   the `.jks` copy, manifest channel meta-data) — see above.
3. **Confirm `versionCode`** is above what's live on Play Console if this
   build is headed there.
4. **Commit and push** (`git add .`, commit, push) — this only carries
   git-tracked files (`app.json`, source, etc.); `android/`, `ios/`,
   `docs/` are all root-gitignored and never travel via git.
5. **On WSL: pull.**
   ```bash
   cd ~/play && git pull origin main
   ```
6. **Resync `android/`** (always — don't assume it's unchanged):
   ```bash
   rm -rf ~/play/android
   cp -r "/mnt/c/Users/LENOVO/Desktop/platform/PataProducts/play/android" ~/play/
   ```
7. **`npm install` if `package.json` changed** since the last WSL build.
8. **Build:**
   ```bash
   cd ~/play/android
   ./gradlew assembleRelease --no-daemon   # APK
   ./gradlew bundleRelease --no-daemon     # AAB, for Play Store
   ```
9. **Verify the signature before trusting the output**, especially after
   any keystore/signing-block change:
   ```bash
   ~/android-sdk/build-tools/36.0.0/apksigner verify --print-certs \
     ~/play/android/app/build/outputs/apk/release/app-release.apk
   ```
   The SHA-1 should match PataSkillsV2's real upload key, not a debug
   certificate. Get PataSkillsV2's reference fingerprint once via the same
   command against its own keystore, and compare.
10. **Copy output to Windows Downloads for install/testing/upload:**
    ```bash
    cp ~/play/android/app/build/outputs/apk/release/app-release.apk \
      "/mnt/c/Users/LENOVO/Downloads/play-<version>.apk"
    ```

## Hard constraints — do not do these

- **Never generate a new keystore for `play`.** It must stay signed with
  PataSkillsV2's key, or a `.aab` upload will be rejected as a mismatched
  app instead of accepted as an update.
- **Never build a production AAB without flipping the manifest channel to
  `production` first**, and never without checking `versionCode` against
  Play Console's live value — same failure modes as PataSkillsV2 (silent
  dead OTA channel; Play Console rollout rejection).
- **Never skip re-copying the `.jks` after `prebuild --clean`** — the
  build will silently fall back to debug-signing (thanks to the
  `keystoreConfigured` guard) and produce an APK that installs fine
  locally but can never be uploaded as an update to the real app.
- **Never assume WSL's `android/` matches Windows** without resyncing —
  unlike PataSkillsV2's native folder (rarely touched), `play`'s gets
  regenerated often enough that assuming staleness is safer than assuming
  freshness.

## Quick reference

| Action | Command |
|---|---|
| Regenerate native project | `npx expo prebuild --clean` (Windows) |
| Copy keystore | `Copy-Item "...PataSkillsV2\android\app\@tonymkay__pataskills-v2.jks" "...play\android\app\@tonymkay__pataskills-v2.jks"` (Windows) |
| Resync android/ to WSL | `rm -rf ~/play/android && cp -r "/mnt/c/Users/LENOVO/Desktop/platform/PataProducts/play/android" ~/play/` |
| Install new deps | `cd ~/play && npm install` |
| Build APK | `cd ~/play/android && ./gradlew assembleRelease --no-daemon` |
| Build AAB | `cd ~/play/android && ./gradlew bundleRelease --no-daemon` |
| Verify signature | `~/android-sdk/build-tools/36.0.0/apksigner verify --print-certs <path-to-apk>` |
| Copy to Downloads | `cp ~/play/android/app/build/outputs/apk/release/app-release.apk "/mnt/c/Users/LENOVO/Downloads/play-<version>.apk"` |
| Check current versionCode | `grep -A1 "versionCode" android/app/build.gradle` |
| Check channel | `grep -A2 "EXPO_RELEASE_CHANNEL\|expo-channel-name" android/app/src/main/AndroidManifest.xml` |
