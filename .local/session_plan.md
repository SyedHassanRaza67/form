# Objective
Replace the 5 separate proxy input fields (host, port, username, password, type) in the user proxy settings with a single **Proxy URL Template** field. The user pastes their full Decodo URL with `{zip}` as a placeholder:

```
http://user-spty3wk2go-country-us-zip-{zip}:Ixd3uSicu3I_Gz4u0b@us.decodo.com:10003
```

Only the zip changes per submission — the server reads the agent's form zip, substitutes it into the URL template username, and uses the result to configure the browser proxy. No database schema changes needed.

---

# Tasks

### T001: Update Proxy UI — Single URL Template Field
- **Blocked By**: []
- **Details**:
  - In `client/src/pages/user-dashboard.tsx`, in the `ProxyTab` component:
    - Add a local `urlTemplate` string state that holds the full URL
    - On load: reconstruct the URL template from stored config fields: `${proxyType}://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`
    - Replace the card that has the 5 separate inputs (host, port, username, password, protocol select) with a single `<textarea>` or `<Input>` for the full URL template
    - Label it "Proxy URL Template" with description: 'Paste your proxy URL. Use `{zip}` as a placeholder — it is replaced with the agent's zip code on every submission.'
    - As the user types, parse the URL using regex `^(https?|socks5):\/\/([^:@]+):([^@]+)@([^:]+):(\d+)$` and update `config.proxyHost`, `config.proxyPort`, `config.proxyUsername` (with `{zip}` kept as-is), `config.proxyPassword`, `config.proxyType`. Show a small green "✓ Valid URL" or red "✗ Invalid format" indicator below the input.
    - Keep the save/test buttons and proxy site assignment card completely unchanged.
    - Update the **geo-targeting preview card** (currently shows `{config.proxyUsername}-zip-90210`):
      - If `proxyUsername` contains `{zip}`, reconstruct the full URL replacing `{zip}` with `90210` for the zip example
      - Show: `http://user-spty3wk2go-country-us-zip-90210:password@us.decodo.com:10003`
      - For the state example, show the username as-is (not applicable for state since template uses zip)
      - Simplify the preview to just show: "With zip 90210:" and the full URL
  - Files: `client/src/pages/user-dashboard.tsx`
  - Acceptance: Proxy page shows a single URL template input. Pasting `http://user-spty3wk2go-country-us-zip-{zip}:Ixd3uSicu3I_Gz4u0b@us.decodo.com:10003` shows "✓ Valid URL". Geo preview shows the full URL with example zip.

### T002: Update Server — {zip} Placeholder Support
- **Blocked By**: []
- **Details**:
  - In `server/routes.ts`, update `buildGeoProxyUsername`:
    - Current: `return baseUsername + '-' + geo.type + '-' + geo.value`
    - New: if `baseUsername` contains `{zip}`, replace `{zip}` with `geo.value` and return the result. Otherwise fall back to existing append behavior for backward compatibility.
    - Handle the case where `geo.type` is null: if username contains `{zip}` and no zip was found in the form, return the username as-is (without `{zip}` substitution — strip `{zip}` or leave it, user can decide — strip it: replace `{zip}` with empty string, which would leave a broken URL, so instead return the base username unchanged — just return `baseUsername` without substituting `{zip}` so the proxy still works but without geo-targeting).
  - Update the proxy test route (`POST /api/proxy/test`): when `user.proxyUsername` contains `{zip}`, replace it with `"00000"` before building the axios proxy config so the test connection works.
  - Files: `server/routes.ts`
  - Acceptance: Submission with zip `84414` produces username `user-spty3wk2go-country-us-zip-84414`. Proxy test works even with `{zip}` in template.

### T003: Test & Verify
- **Blocked By**: [T001, T002]
- **Details**:
  - Restart the workflow
  - Verify proxy page shows URL template field
  - Verify pasting the full Decodo URL auto-fills and shows valid indicator
  - Verify save works correctly
  - Check server logs after test submission to confirm correct username format
  - Files: none
  - Acceptance: No errors; proxy page works end-to-end
