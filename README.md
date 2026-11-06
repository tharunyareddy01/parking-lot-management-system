# Tharunya's space

A Node.js + Express + MySQL parking lot management mini project.

## Requirements
- Node.js 18 or newer
- MySQL 8.x (or a compatible MySQL server)
- A terminal

## Setup
1. Extract the ZIP and open the `TharunyaSree-ParkNova` folder in VS Code.
2. Open MySQL Workbench (or the MySQL command line) and run `database/parking.sql`.
3. In the project terminal run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to a new file named `.env`.
5. Update `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET` in `.env`.
   - If your MySQL root account has no password, leave `DB_PASSWORD=` blank.
   - Use a long random value for `JWT_SECRET`.
6. Start the app:
   ```bash
   npm start
   ```
7. Open `http://localhost:3000` in your browser.
8. Create an account using **Create account**, then log in.

## Make your account an admin
For safety, public signup always creates a normal `user` account. After creating your account, run this in MySQL Workbench:

```sql
USE parknova_db;
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Log out and log back in so the new admin role is loaded into the login token.

## Parking fee
The default fee is ₹20 per started hour, with a minimum charge of one hour. Change `PARKING_RATE_PER_HOUR` in `.env` to change the rate. Restart the server after editing `.env`.

## Four required database tables
- `users` (includes `password_hash` for secure login)
- `parking_slots`
- `vehicles`
- `parking_records`

The project uses exactly these four tables. It does not create a separate roles, payments, or booking table.

## Features
- Signup and login with bcrypt password hashing and JWT authentication
- Admin and user roles
- Admin dashboard summary
- Parking slot creation, status update and deletion
- Vehicle registration and removal
- Vehicle entry with slot availability/type validation
- Vehicle exit with automatic fee calculation
- User-specific vehicle and parking history
- Responsive dark navy, electric blue and violet interface

## Important notes
- A slot cannot be deleted if parking history refers to it.
- A vehicle cannot be removed if it has parking history.
- A vehicle cannot be parked twice at the same time.
- The slot is marked occupied on entry and available on exit.
- Keep `.env` private and never upload it to GitHub.
