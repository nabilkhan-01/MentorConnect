# MentorConnect – Design Notes
This document captures the reasoning and trade-offs behind key design decisions in MentorConnect. It is intended to explain *why* the system is structured the way it is, rather than how it is implemented.

## Why a centralized system was needed (multi-year mentoring context)
- Mentoring relationships often span semesters or years, which makes continuity more important than short-term convenience.
- In practice, information fragments across email threads, spreadsheets, chat apps, and personal notes; the cost shows up later as lost context, duplicated outreach, and uneven support.
- A centralized system prioritizes:
  - A shared source of truth for who is assigned to whom, and when those assignments changed.
  - Institutional memory that outlives individual handoffs (new mentors, graduating mentees, rotating admins).
  - Consistent record-keeping for meetings, follow-ups, and outcomes, without relying on personal discipline alone.
- Trade-off: centralization can feel heavier than ad-hoc tools; the design therefore emphasizes clarity and minimal steps over exhaustive detail.

## Why the app uses a read-only demo mode by default
- The application is configured in read-only mode **specifically for demonstration and evaluation purposes**.
- This default posture ensures the system is safe to explore and prevents accidental edits that could invalidate demo scenarios or confuse evaluators.
- A read-only default supports predictable walkthroughs:
  - Navigation and information architecture can be evaluated without fear of changing state.
  - Multiple viewers can use the same dataset without coordination.
  - The system can highlight intended flows while avoiding “test data drift.”

- In a real deployment, **write permissions are enabled according to user roles** (Admin, Mentor, Mentee).
- Trade-off: read-only limits authenticity for power users; therefore, write access is treated as an **explicit, deliberate configuration choice**, not the default.


## Role-based structure (Admin, Mentor, Mentee) and why roles are separated
- Mentoring programs have inherently different responsibilities:
  - Admin: program oversight, assignments, quality assurance, and escalation paths.
  - Mentor: relationship stewardship, recurring check-ins, and targeted guidance.
  - Mentee: goals, progress signals, and requests for support.
- Separating roles reduces ambiguity and cognitive load by showing each user only what they can act on and what they should be accountable for.
- Role separation also protects trust:
  - It avoids accidental exposure of sensitive notes to the wrong audience.
  - It clarifies which interactions are private (mentor–mentee) versus program-level (admin oversight).
- Trade-off: rigid roles can be limiting in edge cases (e.g., mentor who is also an admin). The design assumes clear defaults first, with room to expand into multi-role users later.

## Design decisions behind group chats (mentor–mentees, admin–mentors)
- Group chat is used deliberately, not as a universal communication layer.
- Mentor–mentees group chat supports:
  - Efficient broadcast of schedules, reminders, and shared opportunities.
  - Peer learning and normalization (mentees can see questions others ask).
  - Reduced repetition for mentors managing multiple mentees.
- Admin–mentors group chat supports:
  - Program coordination (policy updates, deadlines, logistics).
  - A channel for mentors to surface patterns and operational issues.
- Trade-offs and boundaries:
  - Group chat can dilute individual accountability; the design still preserves one-to-one context through structured records (meetings/feedback).
  - Group chat can become noisy; the intent is to keep it focused on coordination and shared context rather than private performance discussions.

## How meetings and feedback are treated as structured records
- Meetings and feedback are captured as records because they represent decisions and commitments, not just conversation.
- Structured records help the program answer practical questions over time:
  - When was the last check-in?
  - What goals were set, and what follow-ups were agreed?
  - Are there recurring blockers that need escalation?
- This framing supports consistency without forcing verbosity:
  - A record can be brief but still intentional.
  - Records create a timeline that is easier to review than chat history.
- Trade-off: structure can feel formal; the design goal is to keep the schema minimal enough to encourage use, while still enabling meaningful reporting and continuity.

## Design boundaries
-The current design prioritizes clarity and safety over feature breadth.
-Certain capabilities are intentionally constrained in the demo configuration to ensure the system remains understandable and predictable for evaluation.

## Demo data and privacy
All data used in the demo configuration is **system-generated** and exists solely to make the system explorable.

- No real student or faculty data is stored
- No real communication or mentoring records are included
- The data model mirrors realistic scenarios without representing real individuals

This approach ensures the project can be shared and evaluated publicly without privacy or ethical concerns.