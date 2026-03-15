# ShiftSync — User Guide

ShiftSync is a multi-location staff scheduling platform for Coastal Eats restaurant group.

---

## Quick Start — Test Credentials

All accounts use the password: **`password123`**

| Role    | Email                            | What they can do                          |
|---------|----------------------------------|-------------------------------------------|
| Admin   | `admin@coastaleats.com`          | Everything — all locations, audit log     |
| Manager | `manager-sf@coastaleats.com`     | SF location scheduling & approvals        |
| Manager | `manager-ny@coastaleats.com`     | NY location scheduling & approvals        |
| Staff   | `emma.wilson@coastaleats.com`    | View schedule, request swaps/drops        |
| Staff   | *(other staff — see seed data)*  | Same as above                             |

---

## Role Capabilities

### Admin
- Access to every page and every location
- Create/edit/delete shifts at any location
- Assign staff to any shift
- Approve or reject swap and drop requests
- View the immutable Audit Log
- Create new user accounts

### Manager
- Create, edit, and delete **DRAFT** shifts at assigned locations
- Assign / unassign staff from shifts (with real-time constraint checking)
- Publish and unpublish weekly schedules
- Approve or reject swap and drop requests
- View overtime dashboard and analytics
- Create staff accounts

### Staff
- View their published schedule
- Request to swap a shift with a colleague
- Request to drop a shift (puts it up for grabs)
- Pick up available dropped shifts
- Set their own weekly availability
- Update their profile and skills

---

## Pages

### Schedule
The weekly calendar view. Select a location from the dropdown to load that week's shifts.

**Managers / Admins:**
- **Add Shift** (top-right `+` button) — opens a dialog to create a shift with location, date/time, required skill, headcount, and edit cutoff hours.
- **Edit / Delete** — buttons appear on DRAFT shift cards. Only draft shifts can be modified.
- **Assign Staff** — click the `Users` button on a shift card to open the assignment panel:
  - See who is already assigned (with unassign buttons)
  - Browse eligible staff for that location
  - Click **Preview** before assigning to see a what-if analysis (projected weekly hours, any constraint violations)
  - Click **Assign** to confirm — any violations (double booking, rest period, skill mismatch) are shown immediately with a plain-English explanation
- **Publish Schedule** — publishes all shifts for the selected location and week, making them visible to staff
- **Unpublish Schedule** — reverts to draft if changes are needed (subject to the edit cutoff)

**Navigation:** Use the Prev / Today / Next buttons to move between weeks.

---

### Coverage
Manage shift swaps and drop requests. Uses three tabs:

**Swap Requests tab**
- Staff can click **Request Swap** to ask a colleague to swap shifts (enter your shift ID and select the target person)
- The target staff member sees an **Accept** button on the request
- Once accepted, a manager sees **Approve / Reject**
- The original requester can **Cancel** the swap while it is pending acceptance

**Drop Requests tab**
- Staff can click **Request Drop** to put a shift up for grabs (enter the shift ID)
- The drop appears in the **Available Shifts** tab for qualified colleagues
- If someone picks it up, a manager sees **Approve / Reject**
- The requester can **Cancel** an unclaimed drop

**Available Shifts tab**
- Shows all open drop requests that the logged-in user is eligible to pick up
- Click **Pick Up** to claim the shift (subject to manager approval)

---

### Staff *(Admin / Manager only)*
Lists all staff and managers. Search by name or email.

- Click **Add Staff** to create a new account — set name, email, password, role, skills, and desired weekly hours
- Role badges show ADMIN / MANAGER / STAFF at a glance
- Skills are shown as coloured pills

---

### Overtime *(Admin / Manager only)*
Weekly view of hours worked per staff member.

- Use the week navigator to view any week
- Traffic-light status: **OK** (< 35 h), **At Risk** (35–40 h), **Overtime** (40+ h)
- Summary cards show total staff count, at-risk count, and overtime count at a glance

---

### Analytics *(Admin / Manager only)*
28-day fairness and distribution report.

- **Avg Hours** — average hours per staff member over the period
- **Std Deviation** — how evenly spread hours are (lower = more fair)
- The table shows total hours, desired hours with delta, premium shift count (Fri/Sat evenings), and a fairness score bar
- Sorted by hours descending so over-scheduled staff appear first

---

### On Duty Now *(Admin / Manager only)*
Live view of who is currently clocked into a shift. Auto-refreshes every 30 seconds.

- Each card shows the staff member's name, shift window, and skills
- A green pulse indicator confirms they are currently on shift

---

### Notifications
In-app notification centre. Notifications are sent for:
- New shift assignments
- Schedule published
- Swap request received / accepted / approved / rejected
- Drop shift available
- Overtime warning

Click any unread notification to mark it read. Use **Mark all read** to clear the badge.

---

### Settings
Three tabs:

**Profile tab** — update name, phone, desired weekly hours, and skills

**Availability tab** — set your weekly recurring availability:
- Toggle each day on/off
- Set start and end times for available days
- Click **Save Availability** — managers will see this when assigning shifts

**Account tab** — view your role, user ID, and email

---

### Audit Log *(Admin only)*
Immutable event-sourced log of every change in the system.

- Filter by **Aggregate Type** (Shift, SwapRequest, DropRequest, User)
- Filter by **Event Type** (e.g. `ShiftPublished`, `StaffAssigned`)
- Each row shows the timestamp, aggregate type badge, event name, short aggregate ID, and version number

---

## Key Business Rules (Constraint Enforcement)

The system enforces these rules when assigning staff:

| Rule | Effect |
|------|--------|
| **No double booking** | A staff member cannot be assigned to two overlapping shifts, even across locations |
| **10-hour rest** | Minimum 10 hours required between the end of one shift and start of the next |
| **Skill match** | Staff can only be assigned to shifts requiring a skill they hold |
| **Location certification** | Staff can only work at locations they are certified for |
| **Availability** | Staff can only be assigned during their declared available hours |
| **Daily hours cap** | Warning at 8+ hours/day; hard block at 12+ hours/day |
| **Weekly overtime** | Warning when projected hours reach 35; error at 40+ |
| **Consecutive days** | Warning on 6th consecutive day; manager override required on 7th |

When a violation occurs, the assignment panel shows a clear explanation (e.g. *"Double booking: Emma Wilson already has a shift 9 am–5 pm at SF Downtown"*) and may suggest alternative staff.

---

## Evaluation Scenarios

**The Sunday Night Chaos** — A staff member calls out at 6 pm for a 7 pm shift:
1. Go to **Schedule**, find the shift, click the `Users` icon
2. The assignment panel shows who is currently assigned; click **Unassign**
3. Browse available staff — click **Preview** to check each person for conflicts
4. Assign the first eligible person — they receive an in-app notification instantly

**The Overtime Trap** — Manager unknowingly over-schedules someone:
- Before assigning, click **Preview** to see projected weekly hours
- The what-if result shows an overtime warning if the assignment would push past 40 h
- The **Overtime Dashboard** also shows the full picture for the week

**The Fairness Complaint** — Employee claims they never get Saturday nights:
- Open **Analytics**, find the staff member's row
- Check their **Premium Shifts** count and **Fairness Score** vs. peers

**The Regret Swap** — Staff A wants to cancel a swap before the manager approves:
- In **Coverage → Swap Requests**, the requester sees a **Cancel** button while the swap is in `PENDING_ACCEPTANCE` status
- Cancelling notifies the target staff member

---

## Known Limitations & Assumptions

- **Email notifications** are simulated (in-app only; no real email is sent)
- **Location certification** is managed via seed data; there is no UI to certify/de-certify staff from locations in the current release
- **Overnight shifts** (e.g. 11 pm–3 am) are stored with the correct ISO timestamps and display correctly; the 10-hour rest check handles cross-midnight boundaries
- **Desired hours vs. availability** — desired hours are a soft preference used for analytics and what-if warnings only; they do not block assignment
- **Consecutive day calculation** — any assigned shift on a calendar day counts equally regardless of duration
- **Location spanning timezones** — each location has a single canonical timezone; shifts are stored in UTC and displayed in the location's timezone
- **De-certification** — removing a staff member's location certification does not affect existing past assignments; future assignment attempts will be blocked by the constraint check

---

## Architecture Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Apollo Client, Tailwind CSS v4, shadcn/ui |
| Backend | NestJS 11, Apollo Server 5 (GraphQL), WebSockets (subscriptions) |
| Database | PostgreSQL + Prisma 7 (Query Compiler engine) |
| Auth | JWT (HS256), stored as `shiftsync_token` cookie + localStorage |
| Real-time | GraphQL subscriptions via WebSocket |
| Monorepo | pnpm workspaces + Turborepo |
