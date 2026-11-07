# TalentHub – Campus Placement Management System

TalentHub is a Node.js web application for managing campus placements. Students can view jobs, check eligibility, apply, track interviews, and respond to offers. Companies can post jobs and manage applications. Placement coordinators can manage placement information and view statistics.

## Features

- Login for students, company representatives, and placement coordinators
- Student registration with academic details and consent
- Company and job management
- Eligibility checks based on CGPA, active backlogs, accepted offers, and eligible branches
- Application status tracking
- Interview scheduling and results
- Offer creation, acceptance, and PDF offer letters
- Placement statistics and application history

## Requirements

- Node.js 18 or newer
- npm, installed with Node.js

## Run locally on Windows

1. Open the extracted `talenthub` project folder in VS Code.
2. Open **Terminal → New Terminal**. Make sure the terminal is in the folder containing `package.json`.
3. Install the project dependencies:

   ```powershell
   npm.cmd install
   ```

4. Start the application:

   ```powershell
   npm.cmd start
   ```

5. Keep the terminal open and visit [http://localhost:3000](http://localhost:3000) in your browser.

In PowerShell, use `npm.cmd` if the `npm` command is blocked by the system’s script execution policy.

## Demo accounts

These accounts are added when the application starts with a new database:

| Role | Email | Password |
|---|---|---|
| Placement coordinator | coordinator@talenthub.edu | Coord@123 |
| Company representative (ABC Technologies) | hr@abc.com | Company@123 |
| Company representative (XYZ Systems) | hr@xyz.com | Company@123 |
| Student (Rahul) | rahul@student.edu | Student@123 |
| Student (Priya) | priya@student.edu | Student@123 |
| Student (Arjun) | arjun@student.edu | Student@123 |

## Suggested demonstration

1. Sign in as Rahul and open the jobs list. Check the eligibility result and apply to an eligible job.
2. Sign in as the company representative and review the application. Shortlist the student and schedule an interview round.
3. Record the interview result and issue an offer.
4. Sign in as the student again to view and accept or reject the offer.
5. Sign in as the placement coordinator to view placement statistics and application history.
6. Sign in as Arjun to demonstrate an ineligible application and the reasons shown.

## Project structure

```text
talenthub/
├── public/
│   └── index.html           # Web page and browser-side code
├── src/
│   ├── routers/             # API routes
│   ├── services/            # Application rules and workflows
│   ├── repositories/        # Database queries
│   ├── db/                  # Database setup and demo data
│   └── middleware/          # Login and role checks
├── storage/                 # Generated offer-letter files
├── test/                    # Smoke-test code
├── package.json             # Project scripts and dependencies
├── package-lock.json        # Locked dependency versions
└── README.md
```

## Data and files

The application creates a local SQLite database and demo data when it starts. The database and generated offer letters are local runtime data; they are not required to run the project from a fresh setup.

To reset the demo data, stop the server and remove the local database file. Start the application again to recreate the demo data.

## Workflow summary

1. **Student registration and login:** A student registers with their identity and academic details, then logs in.
2. **Job posting:** A company representative posts a job with requirements such as minimum CGPA, maximum active backlogs, and eligible branches.
3. **Eligibility check:** TalentHub compares the student’s academic details and placement status with the job requirements and shows whether they are eligible.
4. **Application:** An eligible student applies. TalentHub records the application and its status.
5. **Shortlisting and interviews:** The company reviews applicants, shortlists or rejects them, and can schedule interview rounds and record results.
6. **Offer:** After the interview process, the company can issue an offer with an offer letter.
7. **Student response:** The student accepts or rejects the offer. An accepted offer marks the student as placed.
8. **Coordinator oversight:** The placement coordinator reviews placement statistics and application history.


## Notes

This is a local educational project. The demo accounts and default configuration are for demonstration only. Before using the application outside a local classroom demo, configure a secure `JWT_SECRET` and deploy it over HTTPS.
