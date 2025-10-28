# WhiteShares - Real Estate Investment Platform API

A comprehensive real estate investment platform API enabling fractional property ownership,
automated dividend distribution, digital wallet management, and secure payment processing through
Plaid and PayPal integrations.

## 🚀 Key Features

### Investment & Portfolio Management

- **Fractional Property Investment**: Enable users to purchase shares in real estate properties
- **Portfolio Management**: Comprehensive property portfolio creation and management
- **Investment Tracking**: Track user investments across multiple properties
- **Share-based Ownership**: Manage fractional ownership through a share-based system

### Financial Services

- **Digital Wallet**: Integrated wallet system for managing user funds
- **Dividend Distribution**: Automated dividend calculations and distributions to investors
- **Payment Processing**: Secure payment handling through Plaid and PayPal
- **Bank Account Integration**: Connect user bank accounts via Plaid for seamless transactions

### Authentication & Security

- **Multi-Authentication Support**: JWT, Session-based, and Google OAuth
- **CSRF Protection**: Built-in CSRF protection for secure transactions
- **Rate Limiting**: API rate limiting for enhanced security
- **Secure Session Management**: Custom session store with Drizzle ORM

### Technical Features

- **TypeScript Implementation**: Full TypeScript support for type safety
- **RESTful API Design**: Well-structured API endpoints with standardized responses
- **Database Management**: PostgreSQL with Drizzle ORM
- **Media Management**: Cloudinary integration for property images
- **Email Services**: Nodemailer integration for notifications

## 📁 Project Structure

```bash
├── src/
│   ├── app/                          # Feature-based modules
│   │   ├── authentication/           # User authentication & JWT management
│   │   ├── dividend/                # Dividend calculation & distribution
│   │   ├── media/                   # Media upload & management (Cloudinary)
│   │   ├── onboarding/              # User onboarding process
│   │   ├── order/                   # Investment order processing
│   │   ├── payment/                 # Payment processing & history
│   │   ├── paypal/                  # PayPal integration
│   │   ├── plaid/                   # Plaid bank integration
│   │   ├── portfolio/               # Property portfolio management
│   │   ├── user/                    # User profile management
│   │   └── wallet/                  # Digital wallet functionality
│   ├── controllers/                 # Base controllers
│   ├── core/                        # Core utilities (pagination, sorting, etc.)
│   ├── databases/                   # Database configuration & migrations
│   │   └── drizzle/                # Drizzle ORM setup
│   ├── middlewares/                 # Authentication & authorization middleware
│   ├── models/                      # Database models & schemas
│   │   └── drizzle/                # Drizzle schema definitions
│   ├── passport/                    # Passport.js strategies
│   ├── routes/                      # API route configuration
│   ├── service/                     # Shared services (email, OTP, etc.)
│   ├── session/                     # Custom session store
│   ├── templates/                   # Email templates
│   ├── utils/                       # Utility functions
│   ├── validators/                  # Input validation schemas
│   ├── app.ts                       # Express app configuration
│   └── server.ts                    # Server entry point
├── .env.example                     # Environment variables template
├── drizzle.config.ts               # Drizzle ORM configuration
├── package.json
├── tsconfig.json
└── tsup.config.ts                  # Build configuration
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm package manager

### Installation

1. **Clone and Install Dependencies**

```bash
git clone <repository-url>
cd whiteshares-api
pnpm install
```

2. **Environment Configuration** Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/whiteshares

# Authentication
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Plaid Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox # or development/production

# PayPal Integration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

3. **Database Setup**

```bash
# Generate database migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Open Drizzle Studio for database management
pnpm db:studio
```

4. **Start Development Server**

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

## 📜 Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

## 🔐 API Authentication

The platform supports multiple authentication methods:

### JWT Authentication

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

### Google OAuth

```bash
GET /api/auth/google
# Redirects to Google OAuth consent screen
```

### Session-based Authentication

- Automatic session management with secure cookies
- CSRF protection enabled
- Custom session store with database persistence

## 🏢 Core API Endpoints

### Portfolio Management

```bash
GET    /api/portfolio              # Get all portfolios
POST   /api/portfolio              # Create new portfolio
GET    /api/portfolio/:id          # Get portfolio details
PUT    /api/portfolio/:id          # Update portfolio
DELETE /api/portfolio/:id          # Delete portfolio
```

### Investment Operations

```bash
POST   /api/order                  # Create investment order
GET    /api/order                  # Get user orders
GET    /api/payment/portfolios     # Get user's invested portfolios
```

### Wallet Management

```bash
GET    /api/wallet                 # Get wallet transactions
GET    /api/wallet/balance         # Get current balance
```

### Dividend System

```bash
GET    /api/dividend/user          # Get user dividends
GET    /api/dividend/portfolio/:id # Get portfolio dividend info
POST   /api/dividend/admin/create  # Create dividend distribution (Admin)
```

### Bank Integration (Plaid)

```bash
POST   /api/plaid/link-token       # Generate Plaid link token
POST   /api/plaid/bank/add         # Add bank account
GET    /api/plaid/bank             # Get connected banks
DELETE /api/plaid/bank/remove      # Remove bank account
GET    /api/plaid/transactions     # Get transaction history
```

## 🏗️ Database Schema

### Key Models

**Users**: User accounts and authentication **Portfolios**: Real estate property listings
**Investments**: User investments in properties **Payments**: Payment transactions (Plaid/PayPal)
**Wallet**: User wallet and transaction history **Dividends**: Portfolio and user dividend records
**Media Library**: Property images and documents

### Investment Flow

1. User browses available properties (portfolios)
2. User connects bank account via Plaid
3. User places investment order for property shares
4. Payment processed through connected bank account
5. Investment recorded and portfolio shares updated
6. Dividends calculated and distributed based on ownership

## 🔒 Security Features

- **CSRF Protection**: Implemented across all state-changing endpoints
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation with Zod schemas
- **Secure Headers**: Helmet.js for security headers
- **Session Security**: Secure cookie configuration
- **Database Security**: Parameterized queries with Drizzle ORM
- **Authentication**: Multi-factor authentication support

## 🌐 API Response Format

All API responses follow a consistent format:

```json
{
	"status": 200,
	"message": "Success message",
	"data": {
		// Response data
	},
	"pagination": {
		"page": 1,
		"limit": 10,
		"total": 100,
		"totalPages": 10
	}
}
```

Error responses:

```json
{
	"status": 400,
	"message": "Error message",
	"data": null
}
```

## 🧰 Technology Stack

### Backend Framework

- **Express.js**: Web application framework
- **TypeScript**: Type-safe JavaScript
- **Node.js**: Runtime environment

### Database & ORM

- **PostgreSQL**: Primary database
- **Drizzle ORM**: Type-safe database toolkit
- **Drizzle Kit**: Database migrations and management

### Authentication & Security

- **Passport.js**: Authentication middleware
- **JWT**: JSON Web Tokens
- **bcrypt**: Password hashing
- **Helmet**: Security headers
- **CSRF**: Cross-site request forgery protection

### Financial Services

- **Plaid**: Bank account integration and transactions
- **PayPal**: Payment processing

### External Services

- **Cloudinary**: Media storage and optimization
- **Nodemailer**: Email service
- **Google OAuth**: Social authentication

### Development Tools

- **Nodemon**: Development server with hot reload
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **Husky**: Git hooks
- **TSUP**: TypeScript build tool

## 🚀 Production Deployment

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

### Environment Considerations

- Set `NODE_ENV=production`
- Use production database credentials
- Configure production-grade session store
- Set up proper logging and monitoring
- Enable HTTPS with proper SSL certificates
- Configure production Plaid environment
- Set up proper backup strategies

## 📊 Development Guidelines

### Code Structure

- Follow feature-based module organization
- Use TypeScript for type safety
- Implement proper error handling
- Write comprehensive input validation
- Follow RESTful API design principles

### Database Management

- Use Drizzle migrations for schema changes
- Implement proper indexing for performance
- Follow database naming conventions
- Use transactions for critical operations

### Security Best Practices

- Validate all inputs
- Use parameterized queries
- Implement proper authentication checks
- Follow principle of least privilege
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

1. Follow the installation guide above
2. Make your changes
3. Run type checking: `pnpm type-check`
4. Format code: `pnpm format`
5. Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support and questions:

- Create an issue in the repository
- Contact: Typetech IT

---

**WhiteShares** - Democratizing Real Estate Investment Through Technology
# Whiteshares-Backend-Vercel
# Whiteshares-Backend-Vercel
