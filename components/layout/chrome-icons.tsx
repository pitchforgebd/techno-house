import {
  ArrowLeftRight,
  Heart,
  Home,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";

export const IconSearch = createLucideIcon(Search, "size-5 shrink-0");
export const IconCart = createLucideIcon(ShoppingCart, "size-5 shrink-0");
export const IconHeart = createLucideIcon(Heart, "size-5 shrink-0");
export const IconCompare = createLucideIcon(ArrowLeftRight, "size-5 shrink-0");
export const IconUser = createLucideIcon(User, "size-5 shrink-0");
export const IconHome = createLucideIcon(Home, "size-5 shrink-0");
export const IconTrash = createLucideIcon(Trash2, "size-5 shrink-0");
