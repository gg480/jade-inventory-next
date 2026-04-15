# Task 16-a: Auth Guard + Password Change Dialog

## Task Summary
Add authentication guard to the main page and add a password change dialog in the settings tab.

## Work Completed

### 1. Auth Guard (page.tsx)
- Added `isAuthenticated`, `authChecking`, `showApp` state variables
- Added `handleLogin` and `handleLogout` callbacks
- On mount, validates existing `auth_token` via GET /api/auth
- If not authenticated, renders `<LoginPage onLogin={handleLogin} />` instead of main app
- Auth checking shows loading animation (Gem pulse)
- Main app container has fade-in animation (`transition-opacity duration-500`)
- Footer has "退出登录" button
- `SettingsTab` receives `onLogout` prop
- All hooks placed before early returns to comply with React hooks rules

### 2. Password Change API (/api/auth/password/route.ts)
- PUT handler with auth validation
- Validates current password against SysConfig `admin_password`
- New password minimum 6 characters
- New password cannot be same as current
- Uses `upsert` to update/create `admin_password` SysConfig record

### 3. Password Change UI (settings-tab.tsx)
- New "修改密码" card at top of system config tab
- Current password, new password, confirm password fields with show/hide toggles
- Client-side validation (min length, match confirmation)
- Calls authApi.changePassword()
- Toast notifications for success/error
- "退出登录" button when onLogout prop is provided

### 4. API Client (api.ts)
- Added `authApi.changePassword()` method

## Files Changed
- `src/app/page.tsx` — Auth guard + LoginPage integration + fade animation + logout
- `src/app/api/auth/password/route.ts` — New password change API
- `src/components/inventory/settings-tab.tsx` — Password change card + onLogout prop
- `src/lib/api.ts` — authApi.changePassword method

## Lint Result
- 0 errors, 0 warnings
