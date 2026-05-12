# 🎯 LevelUp AI QA Dashboard

A professional dark-mode dashboard for the **LevelUp AI Self-Healing Test Automation** system. Visualize healing performance, cost savings, and system reliability metrics.

![Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🚀 Features

### Overview Dashboard
- **4 Real-Time Metrics**: Total Runs, Success Rate, AI Calls Saved, Token Usage
- **Healing Success Trend**: Interactive line chart showing improvement over time
- **Strategy Breakdown**: Donut chart (Rule Engine vs Pattern vs AI)
- **Cost Savings Panel**: Shows ROI (99% savings vs traditional AI)
- **Recent Healings Table**: Last 20 healing attempts with status and confidence

### Healing Details
- **7-Point Validation Checks**: Syntax, Semantic, Exists, Unique, Visible, Interactable, Security
- **Before/After Code Diff**: Side-by-side code comparison
- **Confidence Score Breakdown**: Visual progress bars for each check
- **Cost Impact**: Token usage and dollar cost per healing

### Analytics
- **Success Rate Trends**: Over time with interactive charts
- **Strategy Distribution**: Which engines handle most failures
- **Cost Analysis**: Detailed cost tracking and projections

### Learned Patterns
- **Pattern Library**: All successful fixes stored for reuse
- **Usage Statistics**: How often each pattern is applied
- **Success Rates**: Per-pattern reliability metrics

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **PostgreSQL** (for production) or **SQLite** (for development)

## 🛠️ Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PrasanthLevelUp/levelup-ai-qa-dashboard.git
cd levelup-ai-qa-dashboard
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your database URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/levelup_qa_dashboard"
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with demo data
npx ts-node scripts/seed.ts
```

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── stats/
│   │   │   ├── overview/       # GET /api/stats/overview
│   │   │   ├── trend/          # GET /api/stats/trend
│   │   │   ├── strategies/     # GET /api/stats/strategies
│   │   │   ├── cost-savings/   # GET /api/stats/cost-savings
│   │   │   └── patterns/       # GET /api/stats/patterns
│   │   └── healings/
│   │       ├── recent/         # GET /api/healings/recent
│   │       └── [id]/           # GET /api/healings/:id
│   ├── healings/[id]/          # Healing Detail Page
│   ├── analytics/              # Analytics Page
│   ├── patterns/               # Learned Patterns Page
│   ├── layout.tsx              # Root Layout
│   └── page.tsx                # Dashboard Home
├── components/
│   ├── charts/                 # Chart components (Recharts)
│   ├── ui/                     # Base UI components
│   ├── dashboard-client.tsx    # Main dashboard component
│   ├── metric-card.tsx         # Metric card component
│   ├── recent-healings-table.tsx
│   ├── cost-savings-panel.tsx
│   └── sidebar.tsx             # Navigation sidebar
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Utility functions
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   └── seed.ts                 # Demo data seeder
└── tailwind.config.ts          # Tailwind configuration
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/overview` | Dashboard overview metrics |
| GET | `/api/stats/trend?period=7d` | Success rate trend data |
| GET | `/api/stats/strategies` | Strategy breakdown |
| GET | `/api/stats/cost-savings` | Cost savings calculation |
| GET | `/api/stats/patterns` | Learned patterns stats |
| GET | `/api/healings/recent?limit=20` | Recent healing attempts |
| GET | `/api/healings/:id` | Detailed healing view |

## 🎨 Design

- **Theme**: Dark mode with emerald green accents
- **Fonts**: Inter / System UI
- **Charts**: Recharts library
- **Inspiration**: GitHub Actions, Grafana, Linear

## 🏗️ Architecture

```
Dashboard (Next.js) ──READ──> PostgreSQL Database <──WRITE── Healing Agent
      │                              │
      └── API Routes ────────────────┘
```

The dashboard is **read-only** - it visualizes data written by the healing agent.

## 📊 Demo Data

Run the seeder to populate with realistic demo data:

```bash
npx ts-node scripts/seed.ts
```

This creates:
- 140 test executions (30 days of history)
- 107 healing actions with confidence scores
- 4 learned patterns
- Token usage records

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Docker
```bash
docker build -t levelup-dashboard .
docker run -p 3000:3000 levelup-dashboard
```

## 📝 License

MIT License - LevelUp AI QA

## 🔗 Related Repositories

- [levelup-ai-qa-agent](https://github.com/PrasanthLevelUp/levelup-ai-qa-agent) - Self-Healing Test Automation Engine
- [selfhealing_agent_poc](https://github.com/PrasanthLevelUp/selfhealing_agent_poc) - Test Repository (POC)
