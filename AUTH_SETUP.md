# Authentication System Documentation

## Overview

Your application now has a complete authentication system using **NextAuth.js (Auth.js v5)** - a free, open-source, and highly scalable authentication solution.

## ✅ What's Installed

### Core Features
- **Sign In/Sign Up Pages**: Complete authentication UI with dark mode support
- **Session Management**: JWT-based sessions (30-day expiration)
- **User Navigation**: Dynamic navbar showing user status and sign-out option
- **OAuth Ready**: Supports Google and GitHub login (optional setup)

### Files Created

1. **`/app/api/auth/[...nextauth]/route.js`**
   - NextAuth API configuration
   - Credentials provider (email/password)
   - Optional OAuth providers (Google, GitHub)
   - JWT session strategy

2. **`/app/auth/signin/page.tsx`**
   - Sign-in page with email/password form
   - OAuth login buttons (conditional)
   - "Remember me" and "Forgot password" options
   - Error handling and loading states

3. **`/app/auth/signup/page.tsx`**
   - Registration form with validation
   - Password strength checking (min 8 characters)
   - Terms of service agreement
   - Auto sign-in after successful registration

4. **`/components/AuthProvider.tsx`**
   - Wraps SessionProvider from NextAuth
   - Makes auth state available throughout app

5. **`/components/Navigation.tsx`** (Updated)
   - Shows "Sign In" button when not authenticated
   - Displays user menu with sign-out option when authenticated
   - Hidden on auth pages for clean UI

6. **`.env.local`** (Updated)
   - Added `NEXTAUTH_SECRET` for JWT signing
   - Added `NEXTAUTH_URL` for proper redirects

## 🚀 Current Status: DEMO MODE

**Important**: The authentication system is fully functional but currently in DEMO MODE:
- **Any email/password combination will work for sign-in**
- User data is NOT persisted (stored only in JWT session)
- Perfect for testing the UI and flow

## 🎯 How to Test

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Sign In" in the navigation bar

4. Try signing in:
   - Email: `test@example.com`
   - Password: `anything`
   - Both fields are required but accept any input

5. After signing in:
   - You'll see your email in the navigation bar
   - Click on it to see the user menu
   - Click "Sign Out" to log out

## 📋 Production Setup (Required for Real Users)

To move from demo mode to production, you need to:

### 1. Set Up a Database

Choose a database solution:
- **PostgreSQL** (Recommended for scalability)
- **MongoDB** (Flexible schema)
- **MySQL** (Traditional choice)
- **Prisma** (Modern ORM that works with all above)

Example with Prisma:
```bash
npm install @prisma/client @auth/prisma-adapter
npx prisma init
```

### 2. Create User Storage Schema

Example Prisma schema (`prisma/schema.prisma`):
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3. Update NextAuth Configuration

In `/app/api/auth/[...nextauth]/route.js`, replace the demo authorize function:

```javascript
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inside CredentialsProvider
authorize: async (credentials) => {
  if (!credentials?.email || !credentials?.password) {
    throw new Error('Invalid credentials');
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  });

  if (!user || !user.password) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(
    credentials.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
```

### 4. Create Registration API

Create `/app/api/auth/register/route.js`:

```javascript
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    });

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
```

### 5. Update Sign-Up Page

In `/app/auth/signup/page.tsx`, update the handleSubmit function to call your registration API:

```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password }),
});

if (!response.ok) {
  const data = await response.json();
  throw new Error(data.error || 'Registration failed');
}
```

### 6. Install Required Dependencies

```bash
npm install bcryptjs @prisma/client @auth/prisma-adapter
npm install -D @types/bcryptjs
```

## 🔐 Optional: Enable OAuth Providers

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret
7. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and generate Client Secret
5. Add to `.env.local`:
   ```
   GITHUB_ID=your-github-id
   GITHUB_SECRET=your-github-secret
   ```

OAuth providers will automatically appear on sign-in/sign-up pages when configured.

## 🛡️ Optional: Protected Routes

Create `/middleware.ts` in your project root to protect specific routes:

```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/resume-tailor/:path*',
    '/whatsapp-monitor/:path*',
    // Add other protected routes
  ]
};
```

This will automatically redirect unauthenticated users to the sign-in page.

## 📱 Session Management

### Check Auth Status Anywhere

```typescript
import { useSession } from 'next-auth/react';

function Component() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Not signed in</div>;
  
  return <div>Welcome {session.user.email}!</div>;
}
```

### Server-Side Auth Check

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Continue with authenticated logic
}
```

## 🎨 UI Features

- **Dark Mode Support**: All auth pages automatically adapt to theme
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Loading States**: Shows skeleton loading while checking auth status
- **Error Handling**: Displays user-friendly error messages
- **Validation**: Client-side validation before API calls

## 🔧 Configuration

All configuration is in `/app/api/auth/[...nextauth]/route.js`:

- **Session Duration**: Currently 30 days (modify `maxAge` in JWT callback)
- **Custom Pages**: Sign-in, sign-up, and error pages customized
- **Callbacks**: JWT and session callbacks for user data management

## 📊 Scalability

NextAuth.js scales seamlessly:
- JWT sessions = stateless, perfect for serverless
- Add database adapter when needed for advanced features
- OAuth providers scale infinitely
- Rate limiting recommended for production

## 🆘 Troubleshooting

### "Invalid credentials" on valid login
- Check database connection
- Verify password hashing
- Console.log the authorize function

### OAuth not showing
- Verify environment variables are set
- Restart dev server after adding env vars
- Check provider configuration

### Session not persisting
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

## 📚 Next Steps

1. **Test the current demo**: Sign in/out, check user menu
2. **Choose a database**: Recommended: PostgreSQL + Prisma
3. **Set up user registration**: Follow production setup guide above
4. **Add protected routes**: Use middleware for auth-only pages
5. **Optional OAuth**: Enable Google/GitHub for social login
6. **Email verification**: Consider adding email confirmation
7. **Password reset**: Implement forgot password flow
8. **User profiles**: Add profile editing functionality

## 🔗 Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Setup Guide](https://www.prisma.io/docs/getting-started)
- [Google OAuth Setup](https://console.cloud.google.com/)
- [GitHub OAuth Setup](https://github.com/settings/developers)

---

**Status**: ✅ Authentication system fully functional in demo mode
**Ready for**: Testing UI, exploring features, development
**Production ready**: After adding database and real user authentication logic
