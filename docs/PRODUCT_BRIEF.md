# Padel League Management App - Product Brief

## Project Overview / Description

A comprehensive web application designed to manage padel leagues and team organization. The app enables users to create accounts, form teams within specific leagues, and manage team invitations. It supports multiple league configurations with different skill levels and gender categories, providing a centralized platform for padel community management.

## Target Audience

- **Primary**: Padel players of all skill levels looking to participate in organized leagues
- **Secondary**: League organizers and club administrators managing padel competitions
- **Tertiary**: Padel clubs and sports facilities hosting league events

## Primary Benefits / Features

### Core Functionality

- **User Registration & Management**: Secure user accounts with profile management
- **League Creation & Management**: Support for multiple leagues with customizable settings
- **Team Formation**: Users can create teams within specific leagues
- **Team Invitations**: Invite system for users to join existing teams
- **Team Availability Management**: Teams can set their weekly availability (minimum 3 days per week)
- **Automated Calendar Generation**: System generates team calendars based on availability when league is ready
- **Admin League Control**: League organizers can determine when leagues are ready to start
- **Multi-Level Support**: League categorization by skill levels (1-4)
- **Gender Categories**: Support for mixed, masculine, and feminine leagues

### Key Benefits

- Streamlined league organization and team management
- Easy team formation and member recruitment
- Automated scheduling based on team availability
- Centralized communication and coordination
- Flexible league configuration options
- User-friendly interface for all skill levels
- Admin-controlled league launch timing

## High-Level Tech/Architecture

### Frontend

- **React** with Vite for fast development and building
- **Tailwind CSS** for responsive styling
- **ShadCN UI** components for consistent design system
- **TypeScript** for type safety and better development experience

### Backend & Database

- **Hono API** for lightweight, fast server-side logic
- **Supabase PostgreSQL** for data persistence and real-time features
- **Firebase Authentication** for secure user management
- **Node.js** runtime environment

### Development & Deployment

- **pnpm** for efficient package management
- **Cloudflare** deployment platform for global performance
- **Embedded PostgreSQL** for local development environment

### Key Architectural Decisions

- Monorepo structure with separate UI and server packages
- RESTful API design with authentication middleware
- Real-time database capabilities through Supabase
- Component-based UI architecture with reusable design system
