# UTM Engagement Platform

A full-stack web application for managing student engagement at the University of Technology, Mauritius (UTM).

## 🚀 Features

### For All Users
- **Role-Based Authentication** - Secure login for Students, Stakeholders, and Administrators
- **Events Management** - Browse, register, and manage university events
- **Committees** - Join and participate in university committees
- **Real-time Updates** - Live data synchronization across the platform

### For Students
- View approved events and register/unregister
- Join active committees
- Post in committee discussion boards
- Submit feedback
- View personal dashboard

### For Stakeholders
- All student features
- Propose new events (requires admin approval)
- Create committees (requires admin approval)
- Access analytics dashboard

### For Administrators
- All stakeholder features
- **User Management** - Ban/unban users, manage roles
- **Approval System** - Approve/reject events and committees
- **Content Moderation** - Review and handle flagged content
- **System Analytics** - View comprehensive platform statistics
- **Activity Logs** - Monitor all system activities

## 📋 Project Structure

```
UTMEngage/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   └── UI.jsx
│   │   ├── contexts/      # React contexts
│   │   │   └── AuthContext.jsx
│   │   ├── services/      # API services
│   │   │   └── api.js
│   │   ├── views/         # Page components
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── DashboardView.jsx
│   │   │   ├── EventsView.jsx
│   │   │   ├── CommitteesView.jsx
│   │   │   ├── UserManagementView.jsx
│   │   │   ├── ModerationView.jsx
│   │   │   └── ActivityLogsView.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
│
├── server/                 # Express backend (Node.js)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # In-memory database
│   │   ├── data/
│   │   │   └── seed.js          # Initial data
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication
│   │   └── index.js             # Main server file
│   ├── __tests__/
│   │   └── api.test.js          # API tests
│   └── package.json
│
└── package.json           # Root package (runs both)
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **Tailwind CSS** - Utility-first CSS
- **Vitest** - Testing framework

### Backend
- **Express 5** - Web framework
- **Node.js** - Runtime environment
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Jest** - Testing framework
- **Supertest** - API testing

## 📦 Installation

### Prerequisites
- Node.js >= 20
- npm

### Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd UTMEngage
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API: `http://localhost:5000`
   - Frontend UI: `http://localhost:3000`

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🔑 Demo Credentials

The platform uses role-based authentication. Click on any role to login:

### Administrator
- **Role:** admin
- **Access:** Full system access
- **Features:** User management, approvals, moderation, analytics

### Stakeholder
- **Role:** stakeholder
- **Access:** Can propose events/committees
- **Features:** Dashboard, analytics, event creation

### Student
- **Role:** student
- **Access:** View and participate
- **Features:** Browse events, join committees, register for events

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Server Tests Only
```bash
npm run test:server
```

### Run Client Tests Only
```bash
npm run test:client
```

### Test Results
- ✅ Server: 14/14 tests passing
- ✅ Client: 2/2 tests passing

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with role
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `PUT /api/events/:id/status` - Approve/reject (admin)
- `POST /api/events/:id/register` - Register for event
- `DELETE /api/events/:id/register` - Unregister

### Committees
- `GET /api/committees` - List all committees
- `GET /api/committees/:id` - Get single committee
- `POST /api/committees` - Create committee
- `PUT /api/committees/:id/status` - Approve/reject (admin)
- `POST /api/committees/:id/join` - Join committee
- `DELETE /api/committees/:id/leave` - Leave committee

### Posts
- `GET /api/committees/:id/posts` - Get committee posts
- `POST /api/committees/:id/posts` - Create post
- `PUT /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/posts/:id` - Delete post (admin)

### Users (Admin Only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `PUT /api/users/:id/ban` - Ban user
- `PUT /api/users/:id/unban` - Unban user
- `DELETE /api/users/:id` - Delete user

### Moderation (Admin Only)
- `GET /api/moderation/reports` - Get all reports
- `POST /api/moderation/reports` - Create report
- `DELETE /api/moderation/reports/:id` - Dismiss report

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/analytics/logs` - Get system logs (admin)

### Feedback
- `POST /api/feedback` - Submit feedback

## 🎨 Design System

### Colors
- **Primary:** #005eb8 (UTM Blue)
- **Secondary:** #00b5e2 (Light Blue)
- **Success:** #10b981 (Green)
- **Warning:** #f59e0b (Orange)
- **Error:** #ef4444 (Red)

### Typography
- **Font:** Inter (Google Fonts)
- **Headings:** 600-800 weight
- **Body:** 400-500 weight

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Protected API routes
- Token expiration (24 hours)
- XSS protection
- CORS enabled

## 📱 Responsive Design

The platform is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deployment

### Production Build

```bash
# Build client for production
npm run build

# Start server in production mode
cd server && npm start
```

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

## 📈 Future Enhancements

- [ ] Real-time notifications with WebSocket
- [ ] Email notifications for events
- [ ] File upload for event images
- [ ] Advanced search and filtering
- [ ] Export analytics to PDF/CSV
- [ ] Mobile app (React Native)
- [ ] Calendar integration
- [ ] Multi-language support
- [ ] Dark mode
- [ ] MongoDB/PostgreSQL integration

## 👥 Contributors

- **Pierre Adrien Genave** - Initial Study & Prototype Design
- Based on UTM University-Community Engagement Research

## 📄 License

ISC

## 🐛 Bug Reports

If you find any bugs, please create an issue in the repository with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)

## 💡 Support

For support or questions:
- Check the [QUICKSTART.md](./QUICKSTART.md) guide
- Review the API documentation above
- Test the application with `npm test`

---

**Built with ❤️ for the University of Technology, Mauritius**
