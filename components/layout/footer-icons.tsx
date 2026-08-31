import { MapPin, Phone } from "lucide-react";
import {
  FOOTER_SOCIAL_BRAND_ICONS,
  type FooterSocialBrand,
} from "@/components/icons/social-brand-icons";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";

export const IconMapPin = createLucideIcon(MapPin, "size-4");
export const IconPhone = createLucideIcon(Phone, "size-4");

export const FOOTER_SOCIAL_ICONS = FOOTER_SOCIAL_BRAND_ICONS;

export type { FooterSocialBrand };
