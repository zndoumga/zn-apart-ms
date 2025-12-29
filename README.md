# ZN Apartment Management Studio

A comprehensive web application for managing multiple Airbnb service apartments remotely. Built for property owners based in France managing properties in Cameroon with on-site staff.

## Features

### Dual-Mode Access
- **Staff Mode**: Day-to-day operations (bookings, expenses, tasks)
- **Admin Mode**: Full management (finances, properties, analytics, settings)

### Core Functionality
- 📅 **Bookings Management** - Complete reservation tracking with calendar view
- 💰 **Expense Tracking** - Categorized expenses with receipt uploads
- 💵 **Mobile Money Account** - Balance tracking with automatic deductions
- 📋 **Kanban Task Board** - Drag-and-drop task management
- 💬 **Staff Requests** - Communication with comment threads
- 🏠 **Properties Management** - Multi-property support with photo galleries
- 👥 **Customer CRM** - Guest database with booking history
- 🔧 **Maintenance Log** - Before/after photo documentation
- 📊 **Financial Analytics** - KPIs, charts, and performance metrics
- 🔐 **Audit Log** - Complete change history tracking

### Currency Support
- Dual currency display (EUR/FCFA)
- Configurable exchange rate
- Automatic currency conversion

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Backend**: Firebase (Firestore + Storage)
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (for production)

### Installation

1. Clone the repository:
```bash
cd "ZN Appartment Management Studio"
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

4. Start the development server:
```bash
npm run dev
```

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Firebase Storage
4. Copy your project credentials to `.env`
5. Set up Firestore security rules (see `firestore.rules` for examples)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base components (Button, Input, Modal, etc.)
│   ├── layout/         # Layout components (Sidebar, Header)
│   ├── bookings/       # Booking-specific components
│   ├── expenses/       # Expense-specific components
│   ├── kanban/         # Kanban board components
│   └── ...
├── pages/              # Page components
├── hooks/              # Custom React Query hooks
├── services/           # Firebase service functions
├── store/              # Zustand store
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Default Admin Password

The default admin password is `admin123`. Change it immediately in Settings after first login.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

Private - All rights reserved

## Author

Built for ZN Apartments property management.
