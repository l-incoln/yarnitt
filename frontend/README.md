# Yarnitt Frontend

A modern, production-ready Next.js 14 e-commerce frontend for the Yarnitt handmade crochet marketplace.

## Features

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Full E-commerce Flow**: Product browsing, cart, checkout, and order management
- **Authentication**: User registration and login with JWT
- **State Management**: Zustand for cart and auth state with localStorage persistence
- **Form Validation**: React Hook Form with Zod schemas
- **Data Fetching**: React Query for efficient server state management
- **TypeScript**: Strict type checking for reliability
- **Responsive**: Mobile-first design that works on all devices

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack React Query
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:4000

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## Project Structure

```
frontend/
├── pages/                  # Next.js pages
│   ├── _app.tsx           # App wrapper with providers
│   ├── _document.tsx      # HTML document customization
│   ├── index.tsx          # Homepage
│   ├── shop.tsx           # Product listing with filters
│   ├── cart.tsx           # Shopping cart
│   ├── checkout.tsx       # Checkout flow
│   ├── product/[id].tsx   # Product details
│   ├── seller/[id].tsx    # Seller profile
│   ├── auth/              # Authentication pages
│   ├── orders/            # Order history and details
│   ├── blog/              # Blog pages
│   ├── about.tsx          # About page
│   └── contact.tsx        # Contact page
├── src/
│   ├── components/        # React components
│   │   ├── Auth/         # Login and registration forms
│   │   ├── Blog/         # Blog card
│   │   ├── Cart/         # Cart components
│   │   ├── Checkout/     # Checkout forms
│   │   ├── Common/       # Reusable components
│   │   ├── Footer/       # Footer component
│   │   ├── Header/       # Header with search and cart
│   │   ├── Product/      # Product cards and details
│   │   └── Sidebar/      # Category sidebar
│   ├── layouts/          # Layout components
│   │   └── MainLayout.tsx
│   ├── lib/              # Utilities and API client
│   │   ├── api.ts        # Axios API client
│   │   └── utils.ts      # Helper functions
│   ├── store/            # Zustand stores
│   │   ├── authStore.ts  # Authentication state
│   │   └── cartStore.ts  # Shopping cart state
│   ├── styles/           # Global styles
│   │   └── globals.css   # Tailwind and custom styles
│   └── types/            # TypeScript types
│       └── index.ts
├── .env.local            # Environment variables (not in git)
├── next.config.js        # Next.js configuration
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Available Pages

- **/** - Homepage with featured products
- **/shop** - Browse all products with category filters
- **/product/[id]** - Individual product details
- **/cart** - Shopping cart
- **/checkout** - Checkout and payment
- **/auth/login** - User login
- **/auth/register** - User registration
- **/orders** - Order history (authenticated)
- **/orders/[id]** - Order details (authenticated)
- **/seller/[id]** - Seller profile and products
- **/blog** - Blog posts
- **/blog/[slug]** - Individual blog post
- **/about** - About page
- **/contact** - Contact form

## Key Features

### State Management

- **Cart Store**: Persistent shopping cart with add, remove, update, and clear operations
- **Auth Store**: User authentication state with login/logout

### Form Validation

All forms use React Hook Form with Zod schemas for validation:
- Login/Register forms
- Shipping address form
- Contact form

### API Integration

The API client (`src/lib/api.ts`) includes:
- Automatic JWT token attachment
- 401 error handling with redirect to login
- Type-safe API methods for:
  - Products
  - Orders
  - Authentication
  - Users

### Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Mobile menu
- Touch-friendly UI elements

## Styling

The project uses Tailwind CSS with custom design tokens:

- **Colors**: Brown palette for brand identity
- **Border Radius**: Custom values for cards, buttons, and pills
- **Shadows**: Card and hover shadows
- **Components**: Pre-styled components in `globals.css`

## Development Workflow

1. Make changes to components or pages
2. TypeScript will catch type errors
3. Hot reload will update the browser
4. Build to test production bundle
5. Commit changes

## Notes

- TypeScript strict mode is enabled for better type safety
- All API calls are type-safe
- Forms include comprehensive validation
- Cart and auth state persist across page reloads
- Images should be optimized and served from the backend

## License

This project is part of the Yarnitt marketplace platform.
