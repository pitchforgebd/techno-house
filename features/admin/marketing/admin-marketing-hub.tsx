import Link from "next/link";
import {
  AtSign,
  Bell,
  BookOpen,
  IdCard,
  LayoutTemplate,
  Megaphone,
  Newspaper,
  Tag,
  UserRound,
} from "lucide-react";

const MODULES = [
  {
    href: "/admin/marketing/popups",
    title: "Dynamic Pop-up",
    description:
      "Build eye-catching popup campaigns with customizable images and links for different scenarios.",
    icon: LayoutTemplate,
    iconClass: "bg-violet-100 text-violet-600",
  },
  {
    href: "/admin/marketing/alerts",
    title: "Custom Alert",
    description:
      "Design alert notifications with visual elements and configure their size and display position.",
    icon: Megaphone,
    iconClass: "bg-orange-100 text-orange-600",
  },
  {
    href: "/admin/notifications",
    title: "Notifications",
    description:
      "Configure notification triggers and recipients with personalized delivery preferences.",
    icon: Bell,
    iconClass: "bg-pink-100 text-pink-600",
  },
  {
    href: "/admin/marketing/email-templates",
    title: "Email Templates",
    description: "Organize emails with automated sending rules.",
    icon: AtSign,
    iconClass: "bg-sky-100 text-sky-600",
  },
  {
    href: "/admin/newsletter",
    title: "Newsletters",
    description:
      "View the email subscription list. Campaign sends wait for SMTP.",
    icon: Newspaper,
    iconClass: "bg-teal-100 text-teal-700",
  },
  {
    href: "/admin/blog",
    title: "Blogs",
    description:
      "Organize blog content by topic and publish articles that match your audience interests.",
    icon: BookOpen,
    iconClass: "bg-amber-100 text-amber-700",
  },
  {
    href: "/admin/marketing/sale-alerts",
    title: "Custom Sell Alert",
    description:
      "Trigger targeted product sell notifications when visitors browse your online store.",
    icon: Tag,
    iconClass: "bg-cyan-100 text-cyan-700",
  },
  {
    href: "/admin/marketing/visitors",
    title: "Custom Visitors",
    description:
      "Display personalized visitor counts on product pages to boost engagement.",
    icon: UserRound,
    iconClass: "bg-violet-100 text-violet-700",
  },
  {
    href: "/admin/marketing/subscribers",
    title: "Subscribers",
    description: "View and manage your newsletter subscription database.",
    icon: IdCard,
    iconClass: "bg-emerald-100 text-emerald-700",
  },
] as const;

export function AdminMarketingHub() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Marketing
        </h1>
        <p className="mt-1 text-body text-neutral-500">
          Manage marketing needs for your site
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm transition hover:border-[#3897f0]/35 hover:shadow-md sm:p-6"
            >
              <span
                className={`inline-flex size-11 items-center justify-center rounded-xl ${module.iconClass}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">
                {module.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {module.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
