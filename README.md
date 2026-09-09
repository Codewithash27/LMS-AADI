# Learning Management System (LMS)

A comprehensive, full-stack Learning Management System built with modern web technologies. This platform enables educational institutions to manage courses, students, batches, exams, and track learning progress with an integrated AI assistant.

## 🚀 Features 

### Admin Features
- **Dashboard**: Comprehensive analytics and overview of system activity
- **Course Management**: Create and manage courses with modules, lessons, videos, and quizzes
- **Student Management**: Add, view, and manage student profiles and enrollments
- **Batch Management**: Organize students into batches with trainers and schedules
- **Exam Management**: Create text-based assignments/exams with question management
- **Grading System**: Review and grade student exam submissions with feedback
- **Reports & Analytics**: View detailed reports on student progress and course performance
- **Activity Tracking**: Monitor student engagement and learning activities

### Student Features
- **Dashboard**: Personalized dashboard with course progress and upcoming exams
- **My Courses**: Browse and access enrolled courses with progress tracking
- **Course Content**: Access video lessons, text content, and interactive quizzes
- **Exams**: Take assignments/exams and view results
- **AI Assistant**: Chat with AI for learning support and image analysis
- **Progress Tracking**: Monitor completion status and learning progress
- **Profile Management**: Update personal information and profile photo

### Technical Features
- **Multi-tenant Architecture**: Support for multiple organizations/tenants
- **Role-based Access Control**: Admin, Super Admin, and Student roles
- **File Upload**: Support for course thumbnails, profile photos, and images
- **AI Integration**: Together AI for chat assistance and image analysis
- **Real-time Progress Tracking**: Track lesson completion and course progress
- **Responsive Design**: Modern UI built with shadcn/ui and Tailwind CSS

## 📸 Screenshots

### Login Page
![Login](./Img/Login.png)

### Admin Dashboard
![Dashboard](./Img/Dashboard.png)

### Courses Management
![Courses](./Img/Courses.png)

### Exams Management
![Exams](./Img/Exams.png)

### Exam Grading
![Exam Grading](./Img/Exam%20Grading.png)

### Students Management
![Students](./Img/Students.png)

### Batches Management
![Batches](./Img/Batches.png)


### Reports & Analytics
### Visuals 1
![Visuals](./Img/Visual1.png)

### Visuals 2
![Visuals](./Img/Visual2.png)


## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Recharts** - Data visualization
- **Framer Motion** - Animation library
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime environment
- **TypeScript** - Type safety
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe SQL ORM
- **Passport.js** - Authentication middleware
- **Express Session** - Session management
- **Multer** - File upload handling

### AI & External Services
- **Together AI** - AI chat and image analysis
- **Image Processing** - Image upload and analysis capabilities

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **Git**

## 🔧 Installation

> Full step-by-step college setup guide: see **[REPORT.md](./REPORT.md)**  
> **Designed & Deployed by Aman Hukkerikar**

Quick start:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Codewithash27/LMS-Learning-Management-System.git
   cd LMS-Learning-Management-System
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL credentials and session secret.
4. **Set up the database**
   ```sql
   CREATE DATABASE lms_db;
   ```
   ```bash
   npm run db:push
   ```
5. **Start the development server** (frontend + backend together)
   ```bash
   npm run dev
   ```
   Open `http://localhost:5000`

## 📁 Project Structure

<img width="652" height="662" alt="image" src="https://github.com/user-attachments/assets/092c6cc2-6502-408d-bfce-549ccfa0a7de" />



## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

## 🔐 Authentication

The system uses Passport.js with local strategy for authentication. Users are authenticated via username and password, with sessions managed by Express Session.

### Default Roles
- **admin** - Full administrative access
- **superadmin** - Super administrative access
- **student** - Student access with limited permissions

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:
- **Users** - User accounts with roles and tenant association
- **Tenants** - Multi-tenant organization support
- **Courses** - Course definitions with metadata
- **Modules** - Course modules
- **Lessons** - Individual lessons (video, text, quiz)
- **Enrollments** - Student course enrollments
- **Exams** - Exam/assignment definitions
- **Questions** - Exam questions
- **Exam Attempts** - Student exam submissions
- **Batches** - Student batch groupings
- **Activity Logs** - User activity tracking
- **Lesson Progress** - Lesson completion tracking

## 🎨 UI Components

The project uses shadcn/ui components for a modern, accessible UI:
- Cards, Buttons, Forms, Dialogs
- Tables, Charts, Progress indicators
- Navigation menus, Sidebars
- Toast notifications, Alerts
- And many more...

## 🤖 AI Features

The system integrates with Together AI for:
- **Chat Assistant**: Students can chat with AI for learning support
- **Image Analysis**: Upload and analyze images for educational purposes
- **Image Generation**: Generate images using AI

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Students
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create exam
- `GET /api/exams/:id` - Get exam details

### AI
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/image-analysis` - Analyze image
- `POST /api/ai/image-upload` - Upload image

*See `server/routes.ts` for complete API documentation*

## 🚢 Deployment

### Production Build

1. **Build the application**
   npm run build
   2. **Set production environment variables**
   
   NODE_ENV=production
   DATABASE_URL=your-production-database-url
   SESSION_SECRET=your-production-session-secret
   TOGETHER_API_KEYS=your-api-keys
   3. **Start the server**sh
   npm start
   ### Environment Considerations
- Ensure PostgreSQL is accessible
- Configure proper CORS settings if needed
- Set up file storage for uploads (consider cloud storage for production)
- Use secure session storage (Redis recommended for production)
- Configure proper file upload limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the amazing component library
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations
- [Together AI](https://together.ai/) for AI capabilities
- All the open-source contributors whose packages made this project possible

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ using React, Express, and PostgreSQL**

