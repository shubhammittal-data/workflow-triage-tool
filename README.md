# Workflow Triage Prioritization Engine

Helps insurance operations teams prioritize which email-dependent workflows are worth automating first.

Pre-loaded with 15 common insurance brokerage workflows including policy renewals, certificate requests, claims coordination, and more.

## How Scoring Works

Each workflow is scored across 6 dimensions:

- **Volume**: How many emails per week
- **Manual Effort**: Time spent per email thread
- **Standardization**: How consistent the workflow is
- **Error Risk**: How often mistakes happen
- **Downstream Impact**: What breaks when delayed
- **System Touchpoints**: How many systems are involved

A weighted formula produces an Automation Priority Score (0-100) with actionable recommendations:
- **Automate Now** (70-100): Strong automation candidate
- **Standardize First** (40-69): Document and standardize before automating
- **Monitor** (0-39): Low ROI on automation currently

## Getting Started

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub and connect to [Vercel](https://vercel.com) for instant deployment.

## Built By

Shubham Mittal | [LinkedIn](https://linkedin.com/in/shubham-mittal) | [Portfolio](https://shubham-mittal.com)
