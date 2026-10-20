import { BarChart3, BookOpen, Building2, FileText } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const features = [
  {
    title: "Manage Courses",
    text: "Create and organize courses with lessons in various formats.",
    icon: BookOpen,
    tone: "violet",
  },
  {
    title: "Create Exams",
    text: "Configure MCQ exams with timing, attempts and question banks.",
    icon: FileText,
    tone: "amber",
  },
  {
    title: "Track Progress",
    text: "Monitor student performance with detailed analytics.",
    icon: BarChart3,
    tone: "green",
  },
  {
    title: "Multi-tenant",
    text: "Isolated environments for each organization or institution.",
    icon: Building2,
    tone: "cyan",
  },
];

export function BrandPanel() {
  const reduce = useReducedMotion();
  const fade = reduce ? { duration: 0 } : { duration: 0.45 };

  return (
    <aside className="auth-brand">
      <motion.div
        className="auth-brand-copy"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={fade}
      >
        <p className="k">Learning management system</p>
        <h2>
          Learn. Test.
          <br />
          <i>Transform.</i>
        </h2>
        <p>
          The complete Learning Management System for educational institutions and organizations.
        </p>
        <div className="auth-features">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...fade, delay: reduce ? 0 : 0.08 * index }}
              >
                <span className={feature.tone}>
                  <Icon strokeWidth={2} aria-hidden />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.article>
            );
          })}
        </div>
        <footer>
          Designed &amp; Deployed by <strong>Aman Hukkerikar</strong>
        </footer>
      </motion.div>
    </aside>
  );
}
