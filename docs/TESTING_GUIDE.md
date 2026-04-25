# Orbiter — Full E2E Testing Walkthrough (Fresh Install)

**URL:** `http://localhost:3000`
**Admin:** `aman@agiready.io` / `OrbiterAdmin1!`

---

## Phase 1: Authentication

### Test 1.1 — Login
1. Open `http://localhost:3000` → should redirect to `/login`
2. Try wrong password → should show "Invalid email or password"
3. Try empty fields → should show validation errors
4. Login with `aman@agiready.io` / `OrbiterAdmin1!` → should redirect to dashboard
5. You see: empty dashboard with "No projects yet. Create your first project."

### Test 1.2 — Session Persistence
6. Close the tab, reopen `http://localhost:3000` → should auto-login (refresh token in cookie)

### Test 1.3 — Theme Toggle
7. Click the sun/moon icon in the topbar → dark mode activates with circular animation
8. Refresh page → dark mode persists
9. Toggle back to light mode

---

## Phase 2: Project Setup

### Test 2.1 — Create First Project
10. Click "+ Create Project" on the dashboard
11. Name: `Orbiter Platform`, Description: `Internal project management tool`
12. Project appears in dashboard grid AND sidebar

### Test 2.2 — Create Second Project
13. Click "+ Create Project" again
14. Name: `Client Website`, Description: `E-commerce redesign`

### Test 2.3 — Navigate Projects
15. Click `Orbiter Platform` in sidebar → redirects to board view
16. Click the **Orbiter** logo in sidebar → goes back to project list
17. Click **"All Projects"** breadcrumb above project tabs → goes back

---

## Phase 3: Task Management (Kanban)

### Test 3.1 — Create Tasks
18. Inside Orbiter Platform → Board tab → click "+ New Task"
19. Create these tasks (one at a time):

| Title | Type | Priority |
|-------|------|----------|
| Set up JWT authentication | feature | (leave default — AI should classify) |
| Design dashboard layout | feature | (leave default) |
| Write API documentation | chore | (leave default) |
| Fix login page styling | improvement | (leave default) |
| Payment integration | feature | (leave default) |
| Update README | chore | (leave default) |

20. All tasks appear in **Backlog** column
21. **AI Priority Detection test:** After a few seconds, check each task's priority:
    - "Set up JWT authentication" → should be P0 (auth keyword)
    - "Payment integration" → should be P0/P1 (payment keyword)
    - "Update README" → should be P3 (docs keyword)
    - Check if tasks show **"AI classified"** or **"Keyword fallback"** indicator

### Test 3.2 — Drag and Drop
22. Drag "Set up JWT authentication" from Backlog → In Progress
23. Original card should DISAPPEAR during drag (no ghost duplicate)
24. Card appears in In Progress column after drop
25. Drag "Design dashboard layout" → Todo
26. Drag "Fix login page styling" → In Progress

### Test 3.3 — Kanban Filters
27. Filter by Priority = P0 → only P0 tasks show
28. Clear filter → all tasks show
29. Search "JWT" → only matching task shows

### Test 3.4 — Table View
30. Click **Table** tab
31. All tasks in a sortable table
32. Click "Priority" column header → sorts by priority
33. Check the **Priority Source** column — shows "ai" or "keyword" or "default"

### Test 3.5 — Task Detail
34. Click any task in the table → detail panel opens
35. Edit the task title, change priority manually
36. Priority source should change to "manual" after manual override
37. Close the panel

---

## Phase 4: Sprints

### Test 4.1 — Create Sprint
37. Click **Sprints** tab → "+ New Sprint"
38. Name: `Sprint 1`, Goal: `Core authentication and setup`
39. Start: next Monday, End: that Friday
40. Sprint appears with "planning" status

### Test 4.2 — Activate Sprint
41. If there's an activate button, activate it → status changes to "active"

### Test 4.3 — Create Another Sprint
42. Create `Sprint 2` for the following week, status: planning

---

## Phase 5: Epics

### Test 5.1 — Create Epic
43. Click **Epics** tab → create epic
44. Title: `Authentication System`, Status: active
45. Start date: this week, End date: 2 weeks from now

### Test 5.2 — Timeline View
46. Click **Timeline** tab
47. Should see the epic as a horizontal bar
48. Sprint boundaries as dashed lines (if sprints have dates)

---

## Phase 6: Bugs

### Test 6.1 — Create Bug Manually
49. Click **Bugs** tab → "+ Report Bug"
50. Title: `Login button misaligned on mobile`
51. Priority: P1, Status: open, Source: manual
52. Bug appears in the list

### Test 6.2 — Bug Detail
53. Click the bug → detail view
54. Change status from "open" to "investigating"
55. Change priority
56. If the bug was from the extension: check Screenshot preview, Console Logs, Capture Details (URL, browser, OS, viewport)

---

## Phase 7: Docs

### Test 7.1 — Create Document
57. Click **Docs** tab → create new doc
58. Title: `Getting Started Guide`
59. Type some content in the rich editor: heading, paragraph, list
60. Content should save

---

## Phase 8: Links

### Test 8.1 — Add Links
61. Click **Links** tab → "+ Add Link"
62. Add: `Production` / `https://orbiter.io` / type: production
63. Add: `Figma` / `https://figma.com/file/xyz` / type: figma
64. Cards appear in the grid with type badges

---

## Phase 9: Environment Variables

### Test 9.1 — Create Env Var
65. Click **Env** tab
66. Add variable: Key: `DATABASE_URL`, Value: `mongodb://localhost/test`, Environment: dev
67. Value should appear masked (dots)

### Test 9.2 — Reveal
68. Click reveal → actual value shows

### Test 9.3 — Copy as .env
69. Click export → copies as `DATABASE_URL=mongodb://localhost/test`

---

## Phase 10: Team Management

### Test 10.1 — Invite Internal User
70. Via API (no invite UI yet):
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aman@agiready.io","password":"OrbiterAdmin1!"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.accessToken))")

curl -X POST http://localhost:3000/api/v1/users/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"om@agiready.io","role":"internal"}'
```
Note the `inviteToken` in the response.

### Test 10.2 — Invite Client
```bash
curl -X POST http://localhost:3000/api/v1/users/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"client@example.com","role":"client"}'
```

### Test 10.3 — Register Invited User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Om Rajpal","password":"OmPassword1!","inviteToken":"PASTE_TOKEN"}'
```

### Test 10.4 — Add Members to Project
```bash
curl -X POST "http://localhost:3000/api/v1/projects/PROJECT_ID/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"userId":"OM_USER_ID","role":"member"}'
```

---

## Phase 11: My Work

### Test 11.1 — Assign Tasks
71. Go to board → open a task → assign it to yourself
72. Click **My Work** in sidebar → assigned task appears

---

## Phase 12: Command Palette

### Test 12.1 — Open & Search
73. Press **Ctrl+K** → palette opens
74. Type "JWT" → finds the task
75. Type "Orbiter" → finds the project
76. Arrow keys to navigate, Enter to select, Esc to close

---

## Phase 13: Keyboard Shortcuts

### Test 13.1 — Try Shortcuts
77. Press **?** → cheat sheet overlay
78. Press **B** → board view
79. Press **T** → table view
80. Press **Esc** → close overlay

---

## Phase 14: Favorites & Recents

### Test 14.1 — Star a Project
81. Hover project in sidebar → click star → Favorites section appears
82. Navigate between projects → Recent section updates
83. Refresh → persists

---

## Phase 15: Notifications

### Test 15.1 — Check Bell
84. Click notification bell → dropdown
85. Create a P0 bug → notification should appear

---

## Phase 16: Settings

### Test 16.1 — Profile
86. Click **Settings** in sidebar
87. Edit name, add skills: `react, typescript, nodejs`
88. Save → "Saved!" confirmation

### Test 16.2 — ChatGPT Connection
89. Click **ChatGPT** in sidebar
90. Click "Connect ChatGPT" → 8-char code, auto-copied
91. OpenAI page opens → enter code → authorize
92. Status changes to "Connected" with email and plan

### Test 16.3 — GitHub Connection
93. On Settings page → GitHub section → "Connect GitHub"
94. Authorize on GitHub → redirected back → "Connected as username"

---

## Phase 17: Client Portal

### Test 17.1 — Login as Client
95. Incognito window → login as client user
96. Should see `/portal` with simplified sidebar, "Client" badge
97. Only sees assigned projects

### Test 17.2 — Client Board
98. Click project → 3 columns: Planned, Working On, Completed
99. Only `clientVisible` tasks visible

### Test 17.3 — Client Restrictions
100. No Bugs, Docs, Env, Sprint tabs visible
101. Read-only — no drag-and-drop

---

## Phase 18: Chrome Extension

### Test 18.1 — Load Extension
102. `chrome://extensions/` → Developer mode → Load unpacked → `F:\Agiready\extension\build\`
103. Pin in toolbar

### Test 18.2 — Auto-Login
104. Be logged into Orbiter at `localhost:3000`
105. Navigate to any website
106. Click extension icon → should auto-login (no login form)

### Test 18.3 — Bug Capture
107. Select project, type description
108. Submit → go to Orbiter Bugs tab
109. New bug shows with: URL, browser, OS, viewport, screenshot, console logs

---

## Phase 19: AI Features

### Test 19.1 — Priority Detection
- Create task with auth/security title → AI classifies as P0
- Check the priority source indicator: "ChatGPT" or "Keyword fallback"
- ChatGPT should be tried FIRST; keywords are fallback

### Test 19.2 — GitHub Sync (manual)
```bash
curl -X GET http://localhost:3000/api/cron/github-sync \
  -H "Authorization: Bearer c/GQXeWKsi2+lB+oZb4zJ+C8hrU7VIE/yJPLL8HxeWo="
```
If GitHub connected + project has repos → fetches commits, creates digest notification.

---

## Checklist

| # | Feature | Status |
|---|---------|--------|
| 1 | Login/Logout | ☐ |
| 2 | Theme Toggle | ☐ |
| 3 | Create Projects | ☐ |
| 4 | Navigation (logo, breadcrumb) | ☐ |
| 5 | Tasks CRUD | ☐ |
| 6 | Kanban DnD (no ghost) | ☐ |
| 7 | Kanban Filters | ☐ |
| 8 | Table View (sort, bulk) | ☐ |
| 9 | Timeline/Gantt | ☐ |
| 10 | Sprints | ☐ |
| 11 | Epics | ☐ |
| 12 | Bugs + metadata display | ☐ |
| 13 | Docs (rich editor) | ☐ |
| 14 | Links | ☐ |
| 15 | Env Variables (encrypt/reveal) | ☐ |
| 16 | Invite Users | ☐ |
| 17 | My Work | ☐ |
| 18 | Cmd+K | ☐ |
| 19 | Keyboard Shortcuts | ☐ |
| 20 | Favorites & Recents | ☐ |
| 21 | Notifications | ☐ |
| 22 | Settings/Profile | ☐ |
| 23 | ChatGPT OAuth | ☐ |
| 24 | GitHub OAuth | ☐ |
| 25 | Client Portal | ☐ |
| 26 | Extension (auto-login + capture) | ☐ |
| 27 | AI Priority (ChatGPT first, keyword fallback) | ☐ |
| 28 | GitHub Sync | ☐ |
