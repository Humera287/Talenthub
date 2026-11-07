# TalentHub – Campus Placement Management (Node.js)

Built from the TalentHub Lab 4 Detailed Design Record: layered architecture
(router → service → repository → database), 11 tables in 3NF, JWT login with three roles,
eligibility rules R1–R4, status-change audit trail, consent log, erasure by anonymisation,
and offer letters stored as files under unpredictable keys.

## Run it (VS Code terminal)
```bash
npm install
npm start
```
Open http://localhost:3000

Dev mode with auto-restart: `npm run dev`. Tests: `npm test`.
Needs Node.js 18 or newer.

## Demo logins (created on first start)
| Role | Email | Password |
|---|---|---|
| Coordinator | coordinator@talenthub.edu | Coord@123 |
| Company (ABC Technologies) | hr@abc.com | Company@123 |
| Company (XYZ Systems) | hr@xyz.com | Company@123 |
| Student (Rahul, CGPA 8.2, 1 backlog) | rahul@student.edu | Student@123 |
| Student (Priya, CGPA 7.5, 0 backlogs) | priya@student.edu | Student@123 |
| Student (Arjun, CGPA 6.5, 3 backlogs) | arjun@student.edu | Student@123 |

To reset everything, stop the server and delete `talenthub.db` and the PDFs in `storage/`.

## Try the scenario from the brief
1. Log in as **rahul** → Open jobs → ABC Technologies shows *Eligible* → Apply.
2. Log in as **hr@abc.com** → Shortlist → Schedule round → mark Pass → Issue offer.
3. Back as **rahul** → Accept offer (download the PDF letter too).
4. Log in as **coordinator** → see statistics and the audit trail.
Log in as **arjun** to see an ineligible student blocked with reasons.

## Folder map
```
src/routers/        HTTP only: parse request, call a service, send response
src/services/       business rules (eligibility, applications, interviews, offers, auth, reports)
src/repositories/   SQL only, one file per entity
src/db/             schema (connection.js) and demo data (seed.js)
src/middleware/     JWT check and role check
public/index.html   the whole front end
test/smoke.test.js  boundary tests + end-to-end flow
```

## Assumptions to confirm (the docs did not specify these)
- The six statuses (ADR-002) are not named in your documents. Used: APPLIED, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, ACCEPTED, REJECTED. Edit `STATUSES` and `TRANSITIONS` in `src/config.js` to change them.
- The five branches are CSE, ISE, ECE, EEE, ME (`BRANCHES` in `src/config.js`).
- An offer needs at least one interview round and every recorded round marked passed.
- Only the coordinator edits CGPA and backlogs; students register with their own values.
- Offer letters are generated as simple PDFs on the server.
- Before deploying: set the `JWT_SECRET` environment variable and serve over HTTPS.
