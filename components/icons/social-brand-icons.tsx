import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

function brandProps(className?: string): SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    className: cn("size-4", className),
  };
}

/** Recognizable brand marks — Lucide does not ship social logos. */
export function IconBrandFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...brandProps()} {...props}>
      <path d="M14 8h3V5h-3c-2.21 0-4 1.79-4 4v2H7v3h3v7h3v-7h2.5l.5-3H13V9c0-.55.45-1 1-1z" />
    </svg>
  );
}

export function IconBrandX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...brandProps()} {...props}>
      <path d="M14.095 10.316 22.286 2h-1.94l-7.115 8.087L7.551 2H2l8.589 12.231L2 22h1.94l7.532-8.543L16.449 22H22l-7.905-11.684zm-2.403 2.734-.869-1.242L4.64 3.64h2.98l5.576 7.971.869 1.242 7.254 10.374h-2.98l-5.925-8.487z" />
    </svg>
  );
}

export function IconBrandYoutube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...brandProps()} {...props}>
      <path d="M21.58 7.2a2.75 2.75 0 0 0-1.94-1.95C18.24 5 12 5 12 5s-6.24 0-7.64.25A2.75 2.75 0 0 0 2.42 7.2 28.8 28.8 0 0 0 2.17 12a28.8 28.8 0 0 0 .25 4.8 2.75 2.75 0 0 0 1.94 1.95C5.76 19 12 19 12 19s6.24 0 7.64-.25a2.75 2.75 0 0 0 1.94-1.95 28.8 28.8 0 0 0 .25-4.8 28.8 28.8 0 0 0-.25-4.8zM10 15.02V8.98L15.27 12 10 15.02z" />
    </svg>
  );
}

export function IconBrandInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...brandProps()} {...props}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.51 5.51 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM17.75 6.5a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z" />
    </svg>
  );
}

export function IconBrandLinkedin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...brandProps()} {...props}>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.83v2.11h.05c.53-1 1.84-2.11 3.79-2.11 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.09c0-1.69-.03-3.87-2.36-3.87-2.36 0-2.72 1.84-2.72 3.75V24h-4V8.5z" />
    </svg>
  );
}

export const FOOTER_SOCIAL_BRAND_ICONS = {
  Facebook: IconBrandFacebook,
  X: IconBrandX,
  YouTube: IconBrandYoutube,
  Instagram: IconBrandInstagram,
  LinkedIn: IconBrandLinkedin,
} as const;

export type FooterSocialBrand = keyof typeof FOOTER_SOCIAL_BRAND_ICONS;

export const FOOTER_SOCIAL_BRAND_COLORS: Record<FooterSocialBrand, string> = {
  Facebook: "hover:border-[#1877F2] hover:text-[#1877F2]",
  X: "hover:border-primary-foreground hover:text-primary-foreground",
  YouTube: "hover:border-[#FF0000] hover:text-[#FF0000]",
  Instagram: "hover:border-[#E4405F] hover:text-[#E4405F]",
  LinkedIn: "hover:border-[#0A66C2] hover:text-[#0A66C2]",
};
