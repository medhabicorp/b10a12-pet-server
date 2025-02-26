# POWTOPIA - A Pet Adoption Platform

# Overview

POWTOPIA is a comprehensive pet adoption platform designed to connect pets in need with loving homes. The platform facilitates pet adoption, donation campaigns for pets, and provides a seamless user experience for both pet seekers and donors. Built with Node.js, Express, and MongoDB, POWTOPIA offers a robust backend API to manage users, pets, adoptions, donations, and payments.

# Features

**User Management**: Register, login, and manage user roles (admin/user).

**Pet Listings**: Browse, search, and filter pets by category, adoption status, and more.

**Adoption Requests**: Submit and manage pet adoption requests.

**Donation Campaigns**: Create, manage, and donate to pet donation campaigns.

**Payment Integration**: Secure payment processing via Stripe for donations.

**Admin Dashboard**: Admin users can manage pets, donations, and adoption requests.

**JWT Authentication**: Secure API endpoints with JSON Web Tokens (JWT).

# Technologies Used

**Backend**: Node.js, Express

**Database**: MongoDB

**Authentication**: JWT (JSON Web Tokens)

**Payment Processing**: Stripe

**Middleware**: CORS, dotenv, jsonwebtoken

**API Testing**: Postman, Thunder Client, or any REST client

# Getting Started

**Prerequisites**
Node.js (v16 or higher)

MongoDB Atlas (or local MongoDB instance)

Stripe account (for payment processing)

Environment variables (.env file)

# Installation

Set up environment variables:
Create a .env file in the root directory and add the following variables:

PORT=5000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
ACCESS_TOKEN_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
Run the server:

npm start
Access the API:
The server will run on http://localhost:5000. You can test the API using tools like Postman or Thunder Client.

API Endpoints
Authentication
POST /jwt: Generate a JWT token for authenticated users.

Users
POST /users: Register a new user.

GET /users: Get all users (admin only).

GET /users/admin/:email: Check if a user is an admin.

Pets
GET /pets: Get all pets with optional filters (category, search, adoption status).

GET /pets/:id: Get details of a specific pet.

GET /pets/category/:name: Get pets by category.

GET /pets/user/:email: Get pets added by a specific user.

POST /pets: Add a new pet (authenticated users only).

PATCH /pets/adopt/:id: Update pet adoption status.

PATCH /pets/:id: Update pet details.

DELETE /pets/:id: Delete a pet.

Donation Campaigns
GET /donationCampaigns: Get all donation campaigns.

GET /donationCampaigns/recommended: Get recommended donation campaigns.

GET /donationCampaigns/:id: Get details of a specific donation campaign.

GET /donationCampaigns/user/:email: Get donation campaigns created by a specific user.

POST /donationCampaigns: Create a new donation campaign.

PATCH /donationCampaigns/:id: Update donation campaign details.

PATCH /donationCampaigns/stop/:id: Stop a donation campaign.

DELETE /donationCampaigns/:id: Delete a donation campaign.

Adoptions
GET /adoptions: Get all adoption requests.

GET /adoptions/user/:email: Get adoption requests by a specific user.

POST /adoptions: Submit a new adoption request.

PATCH /adoptions/reject/:id: Reject an adoption request.

PATCH /adoptions/accept/:id: Accept an adoption request.

Payments
POST /create-payment-intent: Create a payment intent for donations.

POST /payments: Process a payment.

GET /payments/:email: Get payment history for a specific user.

GET /payments/user/:petId: Get payments for a specific pet.

DELETE /payments/:id: Delete a payment record.

PATCH /payments/refund/:id: Process a refund for a payment.

Database Schema
Collections
Users:

email (String)

role (String: admin or user)

Other user-related fields (e.g., name, address, etc.)

# Pets:

name (String)

category (String)

age (Number)

location (String)

image (String)

shortDescription (String)

longDescription (String)

adopted (Boolean)

userEmail (String)

Adoptions:

petId (ObjectId)

email (String)

status (String: pending, accept, reject)

DonationCampaigns:

name (String)

maxDonation (Number)

donatedAmount (Number)

lastDate (Date)

petImage (String)

shortDescription (String)

longDescription (String)

isDonationStopped (Boolean)

userEmail (String)

# Payments:

email (String)

donationAmount (Number)

petId (ObjectId)

refund (Boolean)

# Contributing

Contributions are welcome! If you'd like to contribute to POWTOPIA, please follow these steps:

Fork the repository.

Create a new branch for your feature or bugfix.

# License

This project is licensed under the MIT License. See the LICENSE file for details.

# Acknowledgments

Special thanks to Stripe for providing seamless payment integration.

Shoutout to MongoDB Atlas for making database management a breeze.

Inspired by the love for pets and the need for a better adoption platform.

# Contact

For any questions or feedback, feel free to reach out:

**Email**: muradsust3@gmail.com

**GitHub**: medhabiCorp

POWTOPIA - Because every pet deserves a loving home. 🐾
