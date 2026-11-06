
# 🚗 Tharunya's Space
## Parking Lot Management System

Tharunya's Space is a web-based Parking Lot Management System developed using Node.js, Express.js and MySQL.

The main purpose of this project is to manage parking slots, vehicle entries, vehicle exits and parking fee calculations efficiently.

## ✨ Features

- User Registration and Login
- Admin and User Roles
- Admin Dashboard
- Add, Update and Delete Parking Slots
- Register Vehicles
- Manage Vehicle Details
- Record Vehicle Entry
- Assign Available Parking Slots
- Record Vehicle Exit
- Automatic Parking Fee Calculation
- View Parking History
- Database Management using MySQL

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Website Structure |
| CSS | Website Styling |
| JavaScript | Frontend Functionality |
| Node.js | Backend Runtime |
| Express.js | Backend Framework |
| MySQL | Database |
| JWT | Authentication |
| bcryptjs | Password Hashing |

## 📁 Project Structure

```text
Tharunya's Space/
│
├── config/
│   └── db.js
│
├── database/
│   └── parking.sql
│
├── middleware/
│   └── auth.js
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
│
├── routes/
│   ├── authRoutes.js
│   ├── parkingRoutes.js
│   ├── slotRoutes.js
│   └── vehicleRoutes.js
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## ⚙️ Installation and Setup

### Step 1: Install Requirements

Install the following software:

- Node.js
- MySQL
- MySQL Workbench
- Visual Studio Code

### Step 2: Open Project

Open the project folder in Visual Studio Code.

### Step 3: Install Dependencies

Open the terminal and execute:

```bash
npm install
```

### Step 4: Setup MySQL Database

1. Open MySQL Workbench.
2. Open the `database/parking.sql` file.
3. Execute the SQL script.
4. The database and required tables will be created.

### Step 5: Configure Environment Variables

Create a `.env` file in the main project folder.

Add the following configuration:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=parknova_db
JWT_SECRET=your_secret_key
PARKING_RATE_PER_HOUR=20
```

Replace `your_mysql_password` with your MySQL password.

### Step 6: Run the Project

Execute the following command:

```bash
npm start
```

### Step 7: Open Website

Open your browser and visit:

http://localhost:3000

## 👤 User Account Setup

1. Open the website.
2. Click on Create Account.
3. Enter the required registration details.
4. Register and log in.

New accounts are created with the regular user role by default.

To make an account an administrator, execute:

```sql
USE parknova_db;

UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Replace the email with your registered email address.

Log out and log in again.

## 🗄️ Database Tables

The project uses the following tables:

1. Users
2. Parking Slots
3. Vehicles
4. Parking Records

## 💰 Parking Fee Calculation

The default parking fee is ₹20 per started hour.

The parking fee is calculated based on the vehicle's entry and exit time.

## 🔗 API Routes

| API Route | Description |
|---|---|
| `/api/auth` | User Registration and Login |
| `/api/slots` | Parking Slot Management |
| `/api/vehicles` | Vehicle Management |
| `/api/records` | Parking Entry and Exit |
| `/api/health` | Server and Database Status |

## ⚠️ Important Notes

- MySQL must be running before starting the application.
- Configure the database credentials correctly.
- Do not share your `.env` file.
- Make sure all dependencies are installed.
- Ensure the database is created before running the server.

## 🎯 Project Objective

The objective of Tharunya's Space is to develop an efficient and user-friendly parking management system that simplifies parking operations, reduces manual work and provides organized vehicle and parking slot management.

---

## 👩‍💻 Developed By

**Tharunya Sree**

**Project Name:** Tharunya's Space

**Project Type:** Parking Lot Management System

**Backend:** Node.js and Express.js

**Database:** MySQL

