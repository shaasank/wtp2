# AdminWeb Folder Structure

This document describes the complete folder and file structure for the `adminweb` project, including all directories and files currently present.

## Root

- `.env`
- `.gitignore`
- `admin_setup.sql`
- `app.json`
- `eas.json`
- `index.html`
- `package.json`
- `postcss.config.js`
- `tailwind.config.js`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`
- `folderstructure.md`

## public/

- `public/`
  - (Contains static assets served by the Vite dev server and build output. Exact contents are not listed here because the provided workspace summary did not enumerate them, but this folder typically includes icons, images, or other public resources.)

## src/

- `src/`
  - `App.tsx`
  - `index.css`
  - `main.tsx`

### src/assets/

- `src/assets/`
  - (Contains static asset files such as images, icons, fonts, or other media used by the application.)

### src/components/

- `src/components/`
  - `layout/`
  - `ui/`

#### src/components/layout/

- `src/components/layout/`
  - `AppLayout.tsx`
  - `Sidebar.tsx`
  - `TopBar.tsx`

#### src/components/ui/

- `src/components/ui/`
  - `badge.tsx`
  - `button.tsx`
  - `card.tsx`
  - `checkbox.tsx`
  - `dialog.tsx`
  - `input.tsx`
  - `label.tsx`
  - `select.tsx`
  - `table.tsx`
  - `tabs.tsx`
  - `textarea.tsx`
  - `toast.tsx`
  - `toaster.tsx`

### src/contexts/

- `src/contexts/`
  - `AuthContext.tsx`

### src/hooks/

- `src/hooks/`
  - `useAttendance.ts`
  - `useDashboard.ts`
  - `useLeaves.ts`
  - `useSettings.ts`
  - `useToast.ts`
  - `useUsers.ts`

### src/lib/

- `src/lib/`
  - `date.ts`
  - `supabase.ts`
  - `utils.ts`

### src/pages/

- `src/pages/`
  - `AttendancePage.tsx`
  - `AttendancePoliciesPage.tsx`
  - `CategoryHistoryPage.tsx`
  - `DashboardPage.tsx`
  - `LeavePage.tsx`
  - `LoginPage.tsx`
  - `UsersPage.tsx`

### src/types/

- `src/types/`
  - `index.ts`
