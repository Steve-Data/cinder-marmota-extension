# Marmota Cinder Extension

Personal Cinder source extension for reading public Spanish comics from Marmota.

## Files

- `marmota.js` is the Cinder source extension.
- `repo.json` is the Cinder repository manifest.
- `test_sandbox.mjs` is a local smoke test with mocked Marmota HTML.

## Install In Cinder

1. Publish this folder to a personal GitHub repo.
2. Confirm `repo.json` points `scriptUrl` at the raw URL for `marmota.js`.
   The current default is:

   ```text
   https://raw.githubusercontent.com/Steve-Data/cinder-marmota-extension/main/marmota.js
   ```

3. In Cinder, open Settings -> Extensions -> Add Repository.
4. Paste the raw `repo.json` URL, for example:

   ```text
   https://raw.githubusercontent.com/Steve-Data/cinder-marmota-extension/main/repo.json
   ```

5. Install the Marmota extension from that repository.

## Scope

This extension uses public Marmota pages only. It does not use login cookies, private credentials, paywall access, challenge solving, hidden APIs, mirroring, or bulk download logic.

If Marmota blocks Cinder's normal public fetch or rendered-page fetch APIs, the extension should fail cleanly instead of trying to bypass the site.

## Local Test

Run:

```powershell
node .\test_sandbox.mjs
```

The sandbox test does not contact Marmota. It validates that the extension and manifest parse correctly and that the main parsers work against small local fixtures.

## Release Notes

When changing `marmota.js`, bump both:

- `Marmota.version` in `marmota.js`
- `version` in `repo.json`

Cinder uses the version to detect updates.
