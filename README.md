# Bumm Dashboard

🎨 **Bumm Dashboard**: Next.js dApp with Solana wallet integration, AI-powered smart contract generation, and interactive demo

## Features

- **🔗 Solana Wallet Integration**: Connect with Phantom, Solflare, and other popular wallets
- **🤖 AI-Powered Smart Contract Generation**: Generate, audit, build, and deploy Solana smart contracts using AI
- **💬 Interactive AI Chat**: Real-time chat with AI agents for smart contract development assistance
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🎯 Interactive Demo**: Live demonstration of the platform capabilities
- **⚡ Real-time Updates**: Live status tracking for contract generation, building, and deployment
- **🎨 Modern UI/UX**: Built with Next.js 14, Tailwind CSS, and Framer Motion animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion, GSAP
- **Icons**: Lucide React
- **Blockchain**: Solana Web3.js, Wallet Adapter
- **Language**: TypeScript
- **State Management**: React Hooks, Context API
- **Analytics**: Google Tag Manager

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Run the development server:**
```bash
npm run dev
```

3. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── backend/             # Backend proxy routes
│   │   └── proxy/               # General proxy routes
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # React components
│   ├── analytics/               # Analytics components
│   ├── dashboard/               # Main dashboard screens
│   │   ├── ChatScreen.tsx      # AI chat interface
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   └── LoginScreen.tsx     # Login/authentication
│   ├── demo/                    # Interactive demo
│   │   └── InteractiveDemo.tsx # Live demo component
│   ├── providers/               # Context providers
│   │   └── WalletProvider.tsx  # Wallet context
│   └── ui/                      # Reusable UI components
│       ├── AuditModal.tsx      # Contract audit modal
│       ├── BuildModal.tsx      # Contract build modal
│       ├── DeployModal.tsx     # Contract deployment modal
│       ├── InteractiveCodeEditor.tsx # Code editor
│       ├── WalletModal.tsx     # Wallet connection modal
│       └── ...                  # Other UI components
├── config/                       # Configuration files
│   └── api.ts                   # API configuration
├── hooks/                        # Custom React hooks
│   ├── useAnalytics.ts         # Analytics tracking
│   ├── useBummApi.ts           # API integration
│   ├── useCredits.ts           # Credits system
│   └── useGSAPAnimations.ts    # Animation hooks
├── lib/                         # Utility libraries
│   ├── api.ts                   # API client
│   ├── mockApi.ts               # Mock API for development
│   └── utils.ts                 # Utility functions
├── services/                     # Service layers
│   ├── api.ts                   # API service
│   ├── bummService.ts           # Bumm-specific services
│   └── creditService.ts         # Credits management
├── types/                        # TypeScript type definitions
│   └── dashboard.ts             # Dashboard types
└── utils/                        # Utility functions
    └── generationCommands.ts    # AI generation commands
```

## Key Components

### Dashboard Components
- **Dashboard.tsx**: Main dashboard interface with project management
- **ChatScreen.tsx**: AI chat interface for smart contract development
- **LoginScreen.tsx**: Authentication and wallet connection

### Interactive Demo
- **InteractiveDemo.tsx**: Live demonstration of platform capabilities
- Features real-time AI chat, code generation, and project management
- Responsive design for desktop, tablet, and mobile

### UI Components
- **InteractiveCodeEditor.tsx**: Advanced code editor with syntax highlighting
- **AuditModal.tsx**: Security audit interface
- **BuildModal.tsx**: Contract building interface
- **DeployModal.tsx**: Contract deployment interface
- **WalletModal.tsx**: Wallet connection and management

### Services & Hooks
- **useBummApi.ts**: Main API integration hook
- **useCredits.ts**: Credits system management
- **useAnalytics.ts**: Analytics tracking
- **bummService.ts**: Core business logic services

## Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Variables
Create a `.env.local` file with:
```env
NEXT_PUBLIC_API_URL=your_api_url
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

## Features in Detail

### AI-Powered Smart Contract Generation
- Natural language to Solana smart contract conversion
- Real-time code generation with syntax highlighting
- Support for tokens, NFTs, DeFi protocols, and gaming contracts

### Interactive Demo
- Live demonstration of platform capabilities
- Real-time AI chat with proper message animations
- Responsive design for all device sizes
- Auto-scroll chat functionality

### Wallet Integration
- Support for multiple Solana wallets
- Real-time balance tracking
- Transaction management
- Network switching (MainNet/DevNet)

### Credits System
- AI-powered operations cost credits
- Real-time credit tracking
- Credit history and management
- Insufficient credits handling

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.