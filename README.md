# Ecommerce Backend

Production-ready backend for an advanced e-commerce platform built with Node.js, Express, and PostgreSQL.  
Supports authentication, products, orders, reviews, admin, delivery, notifications, wishlist, and promotions modules.

## Features

- **Auth**: JWT-based authentication, role-based access (admin/user).  
- **Products**: Product CRUD, categories, Cloudinary image uploads.  
- **Orders**: Stripe payment integration, order management.  
- **Reviews**: Product reviews and ratings.  
- **Admin**: Dashboard statistics, user management.  
- **Delivery**: Shipping and logistics management.  
- **Notifications**: Email (SendGrid), SMS (Twilio), push notifications.  
- **Wishlist**: User wishlists and saved items.  
- **Promotions**: Coupons and discount management.  
- **Swagger API docs**: `/api/docs`

## Tech Stack

- Node.js, Express.js
- PostgreSQL
- JWT Authentication
- Stripe for payments
- Cloudinary for media storage
- SendGrid & Twilio for notifications
- Docker-ready

## Environment Variables

Create a `.env` file based on `.env.example`:

