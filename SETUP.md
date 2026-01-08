# Quick Setup Guide

## Environment Variables

Create a `.env` file in the root directory with:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Important**: When deploying to production, replace these with your actual Render backend URLs:
- `VITE_API_BASE_URL=https://your-backend.onrender.com/api`
- `VITE_SOCKET_URL=https://your-backend.onrender.com`

## Running the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Key Files & Locations

### API Configuration
- **Location**: `src/services/api.js`
- **Base URL**: Set via `VITE_API_BASE_URL` environment variable
- **Auth Token**: Automatically added to requests from localStorage

### Socket.io Configuration
- **Location**: `src/services/socket.js`
- **Server URL**: Set via `VITE_SOCKET_URL` environment variable
- **Connection**: Automatically established on user login

### State Management
- **Auth**: `src/contexts/AuthContext.jsx`
- **Cart**: `src/contexts/CartContext.jsx`
- **Notifications**: `src/contexts/NotificationContext.jsx`

### Routes
- **Public**: `/`, `/login`, `/register`, `/restaurants`, `/restaurants/:id`
- **Customer**: `/cart`, `/checkout`, `/orders`, `/orders/:id`
- **Restaurant**: `/restaurant/dashboard`, `/restaurant/menu`, `/restaurant/orders`
- **Rider**: `/rider/dashboard`, `/rider/orders`
- **Admin**: `/admin/users`, `/admin/restaurants`, `/admin/orders`

## Testing the Application

1. **Register a new account** at `/register` (choose role: customer, restaurant, rider)
2. **Login** at `/login`
3. **Browse restaurants** at `/restaurants`
4. **View menu** by clicking on a restaurant
5. **Add items to cart** and proceed to checkout
6. **Place an order** (uses dummy payment)
7. **Track order status** with real-time updates via Socket.io

## Backend Integration Checklist

Ensure your backend:
- ✅ Has CORS enabled for your frontend domain
- ✅ Returns JWT tokens on login/register
- ✅ Socket.io server is running and accepts connections
- ✅ API endpoints match the expected structure (see `src/services/api.js`)
- ✅ Socket events are emitted correctly (see Socket.io events in README.md)

## Common Issues

**CORS Errors**: Add your frontend URL to backend CORS whitelist

**Socket Not Connecting**: Check `VITE_SOCKET_URL` matches backend URL

**401 Unauthorized**: Verify JWT token format and expiration

**API Calls Failing**: Check `VITE_API_BASE_URL` and network tab for errors
