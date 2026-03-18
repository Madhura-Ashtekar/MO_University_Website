# User Flow Diagrams

## Three Roles

| Role | User | What they do | Access |
|------|------|-------------|--------|
| **Nutritionist** | Jane Crawford | Creates trips, manages teams, tracks budgets | Dashboard, Schedules, Teams, Budget |
| **Admin** | MO Operations | Reviews feasibility, sets pricing, resolves TBD, dispatches | Workflows (with Admin Queue) |
| **Student-Athlete** | Athletes on team | (Future) Views meals, logs dietary needs, rates meals | Student Portal |

---

## 1. Nutritionist Flow (Jane Crawford)

```
                    JANE LOGS IN
                         |
                         v
                  +-------------+
                  |  Dashboard  |
                  +-------------+
                  | Today's meals (dietary chips)
                  | Upcoming count
                  | Quick stats
                  +------+------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
   +----------+   +----------+   +---------+
   | Schedules|   |  Teams   |   | Budget  |
   +----------+   +----------+   +---------+


=== SCHEDULES PAGE (Jane's main workspace) ===

+------------------------------------------------------------------+
|  Schedules                                    [+ New Trip]       |
|                                                                  |
|  [Calendar]  [Trips]                                             |
|------------------------------------------------------------------|
|                                                                  |
|  CALENDAR TAB                      TRIPS TAB                     |
|  Month grid with meal dots         Status filter pills:          |
|  Click day → see meals             [All][Submitted][In Review]   |
|  Click "View Trip" → Trips tab     [Dispatched]                  |
|                                                                  |
|                                    Trip detail shows:            |
|                                    - Status guidance banner      |
|                                    - MO/TBD/Not MO counts        |
|                                    - Execution list              |
|                                    - NO admin queue (hidden)     |
|                                    - NO advance buttons          |
+------------------------------------------------------------------+


=== NEW TRIP FLOW (slide-over panel) ===

Jane clicks [+ New Trip]
         |
         v
+---------------------------+
| Choose input method:      |
| [Paste Email] [Upload CSV]|
+---------------------------+
         |
    +----+----+
    |         |
    v         v
  Paste     Upload
  email     .csv file
  text      (parsed)
    |         |
    +----+----+
         |
         v
+---------------------------+
| Fill trip details:        |
| Team Name (dropdown)      |
| School Name (auto-fill)   |
| Sport (auto-fill)         |
| Headcount                 |
+---------------------------+
         |
         v
+---------------------------+
| Set dietary preferences:  |
| Vegetarian % [===] 15%    |  ← Pre-filled from team defaults
| Gluten-Free % [==] 10%   |
| Nut-Free %    [=] 5%     |
+---------------------------+
         |
         v
+---------------------------+
| Review parsed rows        |
| Each row shows:           |
| - Date, meal, location    |
| - Classification badge    |
|   (MO/TBD/Not MO)        |
| - Dietary count breakdown |
+---------------------------+
         |
         v
  TBD meals detected?
    |           |
   yes          no
    |           |
    v           |
  Warning:      |
  "3 meals TBD, |
   need vendor  |
   after submit"|
    |           |
  [Continue]    |
    |           |
    +-----+-----+
          |
          v
  [Submit to Trips]
          |
          v
  Trip created → Trips tab
  Status: "Awaiting admin review"
  Banner: "Our team will confirm
           feasibility shortly."

  ⚠ Backdrop click → "Unsaved work. Close anyway?"


=== TEAMS PAGE ===

+---------------------------+
| Teams            [+ Add]  |
|---------------------------|
| Team cards:               |
| - Name, school, sport     |
| - Headcount, budget       |
| - Dietary % badges        |
| - [Edit Prefs] button     |
|   → inline slider panel   |
+---------------------------+


=== BUDGET PAGE ===

+---------------------------+
| Budget Analytics          |
|---------------------------|
| Filters:                  |
| [Team ▼] [Month ▼] [Clear]
|                           |
| Total spend / cost / margin
| By team breakdown         |
| By month breakdown        |
+---------------------------+
```

---

## 2. Admin Flow (MO Operations)

```
                   ADMIN LOGS IN
                        |
                        v
                 +-------------+
                 |  /workflows |  ← Direct URL (not via Schedules)
                 +-------------+
                 | isAdmin=true (default)
                 | Sees Admin Queue tab
                 +------+------+
                        |
         +--------------+--------------+
         |                             |
         v                             v
  +----------------+         +-----------------+
  | Workflow Tab   |         | Admin Queue Tab |
  | (trip list)    |         | (action items)  |
  +----------------+         +-----------------+


=== ADMIN QUEUE WORKFLOW ===

Admin opens Queue tab
         |
         v
+----------------------------------+
| Queue items sorted by type:      |
|                                  |
| 1. FEASIBILITY REVIEW           |
|    "Baseball - Away Trip"        |
|    [Take Action]                 |
|                                  |
| 2. RESOLVE TBD                  |
|    "Lunch on 3/15 - TBD vendor" |
|    [Resolve]                     |
|                                  |
| 3. BILLING PREP                 |
|    "Soccer - Conference Tourney" |
|    [Take Action]                 |
|    ⚠ Blocked if TBD > 0         |
|                                  |
| 4. DISPATCH APPROVAL            |
|    "Basketball - Regionals"      |
|    [Take Action]                 |
|    ⚠ Blocked if addresses missing|
+----------------------------------+


=== FEASIBILITY REVIEW ===

Admin clicks [Take Action] on feasibility item
         |
         v
  Review trip details + executions
         |
         v
  Approve feasibility
         |
         v
  Status: submitted → feasibility_approved
  Queue:  feasibility item closed
          billing_prep item opened
  Jane sees: "Feasibility confirmed — billing in progress"


=== RESOLVE TBD ===

Admin clicks [Resolve] on TBD item
         |
         v
+---------------------------+
| Vendor name: [________]   |
| Type: (•) Delivery        |
|       ( ) Pickup           |
| [Resolve]                 |
+---------------------------+
         |
         v
  Execution updated:
  - fulfillment_type: tbd → mo_delivery/mo_pickup
  - location_type: restaurant
  - notes: vendor name
  Queue TBD item closed


=== BILLING PREP ===

Admin clicks [Take Action] on billing_prep
         |
         v
  All TBD resolved? ──no──> Error toast:
         |                  "2 TBD meals must be
        yes                  resolved first"
         |
         v
+---------------------------+
| Billing Review Panel      |
| For each MO execution:    |
| - Unit price ($)          |
| - Cost per meal ($)       |
| - Margin (auto-calc)      |
| [Confirm Billing]         |
+---------------------------+
         |
         v
  Status: feasibility_approved → billing_prepped
  Jane sees: "Billing ready — awaiting dispatch approval"


=== DISPATCH APPROVAL ===

Admin clicks [Take Action] on dispatch_approval
         |
         v
  All addresses filled? ──no──> Error 422:
         |                      "Missing pickup/delivery
        yes                      addresses on 2 executions"
         |
         v
  Admin reviews execution details
  Clicks [Dispatch]
         |
         v
  All MO executions → status: "dispatched"
  Nash payload logged (SANDBOX - no real API call)
  Status: billing_prepped → dispatch_approved
  Jane sees: "Dispatched — meals are confirmed!"


=== EXECUTION EDITING ===

Admin clicks [Edit] on any execution
         |
         v
+---------------------------+
| Edit Execution            |
| Time: [__:__]             |
| Meal type: [dropdown]     |
| Fulfillment: [dropdown]   |
| Unit price: [$___]        |
| Cost/meal: [$___]         |
| Dietary counts:           |
|   Veg [__] GF [__] NF [__]
| Nash fields:              |
|   Pickup addr: [________] |
|   Delivery addr: [______] |
|   Contact info: [________]|
|   Window: [start] [end]   |
| [Save]                    |
+---------------------------+
```

---

## 3. Student-Athlete Flow (FUTURE — Not Yet Built)

```
                 STUDENT LOGS IN
                       |
                       v
              +------------------+
              | Student Portal   |
              +------------------+
              | NOT YET BUILT    |
              +--------+---------+
                       |
        +--------------+--------------+--------------+
        |              |              |              |
        v              v              v              v
  +-----------+  +-----------+  +----------+  +----------+
  | My Meals  |  | Dietary   |  | Rate &   |  | Team     |
  | (upcoming)|  | Profile   |  | Feedback |  | Feed     |
  +-----------+  +-----------+  +----------+  +----------+


=== PLANNED: MY MEALS ===

+---------------------------+
| Upcoming Meals            |
|---------------------------|
| SAT Mar 15 — Lunch        |
| Pre-game meal @ restaurant|
| 12:30 PM                  |
| Boxed meal, MO delivery   |
| [View details]            |
|                           |
| SAT Mar 15 — Dinner       |
| Post-game @ hotel         |
| 7:00 PM                   |
| [View details]            |
+---------------------------+


=== PLANNED: DIETARY PROFILE ===

+---------------------------+
| My Dietary Profile        |
|---------------------------|
| Allergies:                |
| [x] Gluten-free           |
| [ ] Nut-free              |
| [ ] Dairy-free            |
| [ ] Vegetarian            |
|                           |
| Custom notes:             |
| [No shellfish, lactose    |
|  intolerant]              |
|                           |
| [Save Profile]            |
+---------------------------+

When saved → auto-updates team dietary
counts for future trips


=== PLANNED: RATE & FEEDBACK ===

+---------------------------+
| Rate Your Meal            |
|---------------------------|
| Lunch — Mar 15            |
| ★ ★ ★ ★ ☆  (4/5)         |
|                           |
| Quality: [====] Great     |
| Portion:  [===] Good      |
| Timing:  [====] Great     |
|                           |
| Comments:                 |
| [Really good chicken,     |
|  could use more sides]    |
|                           |
| [Submit Feedback]         |
+---------------------------+

Feedback feeds into:
- Vendor quality scores
- Budget optimization recs
- Nutritionist visibility


=== PLANNED: TEAM FEED ===

+---------------------------+
| Team Feed                 |
|---------------------------|
| Coach posted:             |
| "Reminder: weigh-in       |
|  before breakfast tmrw"   |
|                           |
| Meal schedule updated:    |
| "Dinner moved to 7:30 PM"|
+---------------------------+
```

---

## Role Access Matrix

| Feature | Nutritionist | Admin | Student |
|---------|:---:|:---:|:---:|
| Dashboard | R | R | - |
| Calendar (view) | R | R | R (own team) |
| Create Trip | RW | RW | - |
| Trip Status | R | RW | - |
| Admin Queue | - | RW | - |
| Advance Workflow | - | RW | - |
| Resolve TBD | - | RW | - |
| Edit Execution | - | RW | - |
| Teams CRUD | RW | RW | - |
| Budget Analytics | R | RW | - |
| Dietary Profile | - | - | RW |
| Meal Rating | - | - | RW |
| Team Feed | R | R | R |

R = Read, RW = Read/Write, - = No access
