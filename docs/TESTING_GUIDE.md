# Orbiter — Testing Guide

This guide covers manual testing of all core features. Use it to verify the platform works end-to-end before any release.

**Platform URL:** https://orbiteragiready.vercel.app
**Test Account:** `piyush@agiready.io` / `A1234567` (Admin)

---

## 1. Authentication

### Login
1. Go to https://orbiteragiready.vercel.app/login
2. Enter email and password
3. Click "Sign in"
4. **Expected:** Redirects to dashboard with project list. No empty state flash.

### Show/Hide Password
1. On login page, click the eye icon next to password field
2. **Expected:** Password text toggles between visible and hidden

### Forgot Password
1. On login page, click "Forgot password?"
2. Enter your email, click "Send reset link"
3. **Expected:** Shows "Check your email" message. Email arrives with reset link.
4. Click the link in email, enter new password
5. **Expected:** Password reset succeeds, can login with new password

### Logout
1. Click avatar (top-right) → "Sign out"
2. **Expected:** Redirects to login page. Back button doesn't return to dashboard.

---

## 2. Team Management (Admin Only)

### Invite User
1. Go to sidebar → "Team"
2. Click "Invite User"
3. Enter email, select role (Admin/Internal/Client)
4. Click "Send Invite"
5. **Expected:** Shows "Invitation email sent" + copyable registration link. User appears under "Pending Invites".

### Invite Status Tracking
1. On Team page, verify users are grouped: Active Members / Pending Invites / Expired Invites
2. Click resend button on pending/expired invite
3. **Expected:** New invite email sent, status refreshes

### Remove User
1. Hover over a user row → trash icon appears
2. Click trash → confirmation dialog appears
3. Click "Remove"
4. **Expected:** User removed from list (no browser alert — styled dialog)

---

## 3. Projects

### Create Project
1. On dashboard, click "New Project"
2. Enter name and description
3. **Expected:** Project appears in sidebar and project grid

### Project Navigation
1. Click a project → redirects to Board view
2. Click through tabs: Board, Table, Timeline, Backlog, Sprints, Bugs, Docs, Links, Env, GitHub, Settings
3. **Expected:** All tabs load without errors

### Project Settings
1. Go to project → Settings tab
2. Edit project name/description → click "Save Changes"
3. **Expected:** Changes saved, sidebar updates

### Add Members to Project
1. In Settings → "Add Member"
2. Select a user from dropdown (only active, non-client users shown as Members; clients auto-assigned as Client)
3. **Expected:** Member added. Info text shows their auto-assigned role.

### Remove Member from Project
1. Hover over member → trash icon
2. Click → confirmation dialog → "Remove"
3. **Expected:** Member removed from project

---

## 4. Kanban Board

### Create Task
1. On Board tab, click "+" on any column or "New Task" button
2. Fill in: Title, Description, Type, Priority, Sprint, Assignees (multi-select)
3. **Expected:** Task appears in the correct column

### Drag and Drop
1. Drag a task card from one column to another
2. **Expected:** Card moves, status updates. No duplicate cards.

### Task Card Menu
1. Hover over a task card → three-dot menu appears (top-right)
2. Click → "Edit task" or "Delete task"
3. Delete shows confirmation dialog
4. **Expected:** Edit opens detail panel, Delete removes task after confirmation

### Task Detail Panel
1. Click a task card → side panel opens
2. Verify: status dropdown, priority dropdown, assignees list, sprint info
3. Change status or priority from the panel
4. **Expected:** Changes reflect on the board immediately

---

## 5. Sprints

### Create Sprint
1. Go to Sprints tab → "New Sprint"
2. Enter name, goal, start date, end date
3. **Expected:** Sprint appears in list with "planning" status

### Start Sprint
1. Click "Start Sprint" on a planning sprint
2. **Expected:** Status changes to "active". Only one sprint can be active at a time.

### View Sprint Board
1. Click on an active sprint
2. **Expected:** Shows Kanban board filtered to tasks assigned to this sprint

### Close Sprint
1. Click "Close Sprint" on active sprint
2. Optionally add retro notes and rollover incomplete tasks
3. **Expected:** Sprint status becomes "closed", velocity tracked

---

## 6. Bugs

### Report Bug
1. Go to Bugs tab → "Report Bug"
2. Enter title, description, priority
3. **Expected:** Bug appears in list

### Bug Detail + Comments
1. Click a bug → detail page
2. Add a comment with @mention (type @ to see team members)
3. **Expected:** Comment posted, mentioned user receives notification + email

---

## 7. Documents

### Create Document (Rich Text)
1. Go to Docs tab → "Write" button
2. Enter title, write content in TipTap editor
3. Use toolbar for formatting (bold, headers, lists, code)
4. Type @ to mention team members
5. **Expected:** Document auto-saves, mentions render as blue chips

### Upload File
1. Go to Docs tab → "Upload" button
2. Select a file (PDF, image, etc.)
3. **Expected:** File uploaded and viewable from docs list

---

## 8. GitHub Integration

### Connect GitHub
1. Go to project → GitHub tab
2. Click "Connect GitHub" → redirects to GitHub OAuth
3. Authorize the app
4. **Expected:** Redirects back to GitHub tab showing "Connected as [username]"

### Add Repository
1. After connecting, search for a repo in the search input
2. Click to add
3. **Expected:** Repo appears in connected list. First sync auto-triggers.

### Sync Now
1. Click "Sync Now" button
2. **Expected:** Animated progress loader (4 steps). After completion, commits and PRs appear.

### AI Summaries
1. After sync, check the "Latest AI Summary" section
2. **Expected:** AI-generated summary of commits and PRs (requires ChatGPT connection by admin)

### Disconnect
1. Click "Disconnect" → confirmation dialog
2. **Expected:** GitHub disconnected, repos cleared

---

## 9. Environment Variables

### Add Variable
1. Go to Env tab → "Add Variable"
2. Enter key (auto-uppercased), value, environment (Dev/Prod)
3. **Expected:** Variable added, value hidden as dots

### Reveal/Hide Value
1. Click eye icon on a variable
2. **Expected:** Value revealed, click again to hide

### Upload .env File
1. Click "Upload .env" → select a .env file
2. **Expected:** Variables imported with progress indicator

### Download .env
1. Click "Download .env"
2. **Expected:** Downloads .env.{environment} file

---

## 10. Notifications

### Notification Bell
1. Click bell icon (top-right)
2. **Expected:** Dropdown shows notifications with solid background, proper styling

### Unread Indicator
1. When there are unread notifications, red dot appears on bell
2. Dropdown shows unread count badge
3. **Expected:** Unread notifications highlighted, blue dot visible

### Mark All Read
1. Click "Mark all read" in dropdown
2. **Expected:** All notifications marked as read

---

## 11. My Work

### View Assigned Tasks
1. Go to sidebar → "My Work"
2. **Expected:** Shows tasks assigned to you, grouped by: Overdue / This Sprint / Upcoming

### Change Task Status
1. Click the status dropdown on any task row
2. Select a new status (e.g., "In Progress")
3. **Expected:** Status updates. Change reflects on the project's Kanban board.

---

## 12. Client Portal

### Login as Client
1. Create a client user (Admin → Team → Invite with "Client" role)
2. Register via invite link, login
3. **Expected:** Redirects to /portal (not dashboard)

### Portal Features
1. View project list with progress cards
2. Click project → Overview (progress stats), Board (3-column Kanban), Links
3. **Expected:** Read-only access, no edit capabilities

### Portal Sign Out
1. Click "Sign Out" at bottom of sidebar
2. **Expected:** Redirects to login page

---

## 13. AI Pipeline

### Connect ChatGPT (Admin Only)
1. Go to sidebar → "ChatGPT"
2. Follow device code flow — enter code at verification URL
3. **Expected:** Connection established, all AI features enabled org-wide

### AI Priority Detection
1. Create a new task with title like "Fix authentication crash on login"
2. **Expected:** Priority auto-classified (AI badge appears on card if ChatGPT connected)

---

## 14. Chrome Extension

### Build Extension
```bash
cd extension
npm install
npm run build
```
Load `extension/build` folder in `chrome://extensions` (Developer mode → Load unpacked)

### Login
1. Open extension popup
2. If platform tab is open and logged in → auto-login
3. Otherwise, enter credentials manually
4. **Expected:** Shows bug capture form after login

### Capture Bug
1. Navigate to any webpage
2. Open extension → enter title, select project
3. **Expected:** Screenshot captured, console logs collected, bug submitted

---

## 15. Info Tooltips

1. Look for (i) icons next to section headers throughout the platform
2. Hover over them
3. **Expected:** Tooltip appears explaining the feature

**Locations:** Sprints, Bugs, Docs, Links, Env Variables, GitHub, Team Management, Project Members, Task Priority, Sprint Form

---

## Quick Smoke Test Checklist

- [ ] Login works without empty state flash
- [ ] Projects load in sidebar
- [ ] Create task → appears on board
- [ ] Drag task between columns
- [ ] Delete task from card menu
- [ ] Create sprint → start → view board
- [ ] Invite user → email received
- [ ] Add member to project
- [ ] Remove member from project
- [ ] GitHub connect → add repo → sync
- [ ] Notifications dropdown shows properly
- [ ] My Work shows assigned tasks with status dropdown
- [ ] Client portal loads projects
- [ ] Forgot password email works
- [ ] Theme toggle (dark/light) works
