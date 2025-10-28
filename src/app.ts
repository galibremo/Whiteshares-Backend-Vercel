import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { urlencoded } from "express";
import helmet from "helmet";
import passport from "passport";

// Passport Strategies
import { corsOptions } from "@/cors";
import appLogger from "@/logger";
import "@/passport/passportCustom";
import "@/passport/passportGoogle";
import appRateLimiter from "@/rateLimiter";
import indexRouter from "@/routes/index.route";
import appRouter from "@/routes/routes.config";
import webhookAppRouter from "@/routes/webhook.routes";
import sessionConfig from "@/session";
import { doubleCsrfProtection } from "@/utils/csrf";
import domainStore from "@/utils/domainStore";
import errorHandler from "@/utils/errorHandler";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

/**
 * Initialize logger
 * This will log all requests to the server
 * This is to monitor the server
 */
appLogger(app);

/**
 * Rate limiter for all requests
 * This will limit the number of requests to the server
 * This is to prevent abuse of the server
 */
// appRateLimiter(app);

/**
 * Store client and server domain
 * This is used to store the client and server domain
 * This is used for authentication
 */
app.use(domainStore);

/**
 * Initialize session
 * This is used to store session data
 * This is used for authentication
 */
app.set("trust proxy", 1);
app.use(sessionConfig);

/**
 * Initialize passport
 * This is used for authentication
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Initialize all routes
 * This will initialize all routes in the server
 */
webhookAppRouter(app);

// Generate CSRF token for all routes
app.use(doubleCsrfProtection);

/**
 * Default route
 * This is the default route for the server
 */
indexRouter(app);

/**
 * Initialize all routes are handled in the api.ts file
 * All routes will start with /api
 * Example: http://localhost:3000/api/auth/login
 */
appRouter(app);

/**
 * Error handler
 * This will handle all errors in the server
 * This is to prevent the server from crashing
 */
errorHandler(app);

export default app;
