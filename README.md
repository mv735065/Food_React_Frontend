# Food Ordering Web Application - Frontend

A production-ready React frontend for a Food Ordering Web Application built with Vite, React Router, Context API, TailwindCSS, and Socket.io.

## Features

- **Multi-role Support**: End Users, Restaurants, Riders, and Admin
- **Real-time Notifications**: Socket.io integration for live order updates
- **State Management**: Context API for Auth, Cart, and Notifications
- **Responsive Design**: Mobile-first with TailwindCSS
- **Protected Routes**: Role-based access control
- **Modern UI**: Clean and intuitive user interface

## Tech Stack

- **React 19** - UI Library
- **Vite** - Build Tool
- **React Router** - Navigation
- **Axios** - HTTP Client
- **Socket.io-client** - Real-time Communication
- **TailwindCSS** - Styling
- **Context API** - State Management

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── Modal.jsx
│   ├── Toast.jsx
│   ├── LoadingSpinner.jsx
│   ├── MenuCard.jsx
│   ├── OrderCard.jsx
│   ├── NotificationBell.jsx
│   └── ProtectedRoute.jsx
├── contexts/           # Context providers
│   ├── AuthContext.jsx
│   ├── CartContext.jsx
│   └── NotificationContext.jsx
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── RestaurantList.jsx
│   ├── RestaurantMenu.jsx
│   ├── Cart.jsx
│   ├── Checkout.jsx
│   ├── OrderStatus.jsx
│   ├── UserOrders.jsx
│   ├── restaurant/     # Restaurant pages
│   ├── rider/          # Rider pages
│   └── admin/          # Admin pages
├── services/           # API and Socket services
│   ├── api.js
│   └── socket.js
├── App.jsx             # Main app component with routing
├── main.jsx            # Entry point
└── index.css           # Global styles with TailwindCSS
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API Base URL (replace with your Render backend URL)
VITE_API_BASE_URL=http://localhost:5000/api

# Socket.io Server URL (replace with your Render backend URL)
VITE_SOCKET_URL=http://localhost:5000
```

**For Production (Render):**
- Replace `http://localhost:5000` with your actual backend URL from Render
- Example: `VITE_API_BASE_URL=https://your-backend.onrender.com` (or `https://your-backend.onrender.com/api`)
  - **Note:** If you set it without `/api`, it will be automatically appended
  - You can set it as either `https://backend.com` or `https://backend.com/api` - both work!
- Example: `VITE_SOCKET_URL=https://your-backend.onrender.com`

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## API Integration

### Base URL Configuration

The API base URL is configured in `src/services/api.js`:
- Reads from `VITE_API_BASE_URL` environment variable
- Defaults to `http://localhost:5000/api` if not set
- Axios instance automatically adds auth token from localStorage

### Socket.io Configuration

Socket.io is configured in `src/services/socket.js`:
- Reads from `VITE_SOCKET_URL` environment variable
- Defaults to `http://localhost:5000` if not set
- Automatically connects when user logs in
- Sends JWT token for authentication

### API Endpoints Used

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

**Restaurants:**
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu

**Orders:**
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders (admin/restaurant)
- `GET /api/orders/user` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

**Rider:**
- `GET /api/riders/orders` - Get assigned orders
- `POST /api/orders/:id/accept` - Accept order

**Admin:**
- `GET /api/admin/users` - Get all users
- `GET /api/admin/restaurants` - Get all restaurants
- `GET /api/admin/orders` - Get all orders

## Socket.io Events

**Client receives:**
- `notification` - General notification
- `order_update` - Order status update
- `new_order` - New order (restaurant)
- `rider_update` - Rider status update
- `order_assigned` - Order assigned to rider

**Client emits:**
- Socket connection with auth token (automatic)

## Authentication Flow

1. User logs in via `/login` page
2. Backend returns JWT token and user data
3. Token stored in localStorage
4. Axios interceptor adds token to all API requests
5. Socket.io connects with token for real-time updates
6. Protected routes check authentication and role

## State Management

### AuthContext
- Manages user authentication state
- Provides login, register, logout functions
- Stores user info and token
- Handles socket connection on login

### CartContext
- Manages shopping cart items
- Persists to localStorage
- Ensures single restaurant per cart
- Calculates totals

### NotificationContext
- Manages real-time notifications
- Listens to socket events
- Tracks unread count
- Provides notification management functions

## User Roles

1. **Customer (default)**: Browse restaurants, place orders, track orders
2. **Restaurant**: Manage menu, view/update orders, dashboard
3. **Rider**: View assigned orders, update delivery status
4. **Admin**: Manage users, restaurants, view all orders

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Render/Vercel/Netlify

1. Set environment variables in your hosting platform:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com` (or `https://your-backend.onrender.com/api`)
     - **Note:** `/api` will be automatically appended if not present
     - Example: If you set `https://backend.com`, it becomes `https://backend.com/api`
   - `VITE_SOCKET_URL` = `https://your-backend.onrender.com`
     - Do NOT include `/api` for socket URL

2. Deploy the `dist/` folder (or connect your Git repository)

3. **Configure CORS on your backend** (CRITICAL - see below)

### Backend CORS Configuration

The backend must allow requests from your Vercel frontend domain. Here's how to configure it:

#### For Express.js Backend:

```javascript
const cors = require('cors');

// Option 1: Allow specific origin (Recommended for production)
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',  // Your Vercel frontend URL
    'http://localhost:5173',              // For local development
    'http://localhost:3000'               // Alternative local port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Option 2: Allow all origins (NOT recommended for production, use only for testing)
// app.use(cors());
```

#### For Render Backend:

1. Go to your Render backend service dashboard
2. Navigate to **Environment** tab
3. Add environment variable:
   - `FRONTEND_URL` = `https://your-frontend.vercel.app`
4. Update your backend CORS configuration to use this environment variable:

```javascript
const cors = require('cors');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Common CORS Issues:

1. **Missing credentials**: Make sure `credentials: true` is set if you're using cookies/auth tokens
2. **Wrong origin**: Double-check your Vercel URL (it should be `https://your-app.vercel.app`)
3. **Preflight requests**: Make sure OPTIONS method is allowed
4. **Headers**: Ensure `Authorization` header is in `allowedHeaders`

#### Verify CORS is Working:

1. Open browser DevTools → Network tab
2. Make an API request from your frontend
3. Check the response headers - you should see:
   - `Access-Control-Allow-Origin: https://your-frontend.vercel.app`
   - `Access-Control-Allow-Credentials: true`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, ...`

If you see CORS errors in the console, the backend CORS configuration needs to be updated.

## Notes

- **Dummy Payment**: The checkout page includes a dummy payment form. No actual payment processing is implemented.
- **Image URLs**: Restaurants and menu items can use image URLs. Update your backend to handle image uploads or use external image services.
- **Error Handling**: All API calls include error handling with user-friendly messages.
- **Loading States**: All pages show loading spinners while fetching data.
- **Responsive Design**: The app is fully responsive and works on mobile, tablet, and desktop.

## Customization

### Changing Colors

Edit `tailwind.config.js` to customize the primary color scheme:

```js
colors: {
  primary: {
    // Your custom color palette
  }
}
```

### Adding New Routes

Add new routes in `src/App.jsx` within the `<Routes>` component.

### Modifying API Calls

All API functions are in `src/services/api.js`. Modify as needed for your backend structure.

## Troubleshooting

**Socket.io not connecting:**
- Check `VITE_SOCKET_URL` is correct
- Verify backend socket.io is running
- Check browser console for connection errors

**API calls failing / CORS errors:**
- Verify `VITE_API_BASE_URL` is correct and matches your Render backend URL
- **CORS Error**: Most common issue - your backend must allow your Vercel frontend URL
  - Check browser console for the exact CORS error message
  - Verify your backend CORS configuration includes your Vercel URL
  - Example: If frontend is `https://myapp.vercel.app`, backend must allow this origin
  - See "Backend CORS Configuration" section above for detailed setup
- Check network tab in DevTools to see the actual request/response
- Verify backend is running and accessible
- Verify JWT token is being sent (check Network tab)

**Build errors:**
- Run `npm install` to ensure all dependencies are installed
- Clear `node_modules` and reinstall if needed

## License

This project is open source and available for use in your food ordering application.
