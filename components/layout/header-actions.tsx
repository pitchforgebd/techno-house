import { HeaderCart } from "@/components/layout/header-cart";
import { HeaderAccount } from "@/features/account/header-account";
import { HeaderListLinks } from "@/features/lists/header-list-links";

export function HeaderActions() {
  return (
    <nav aria-label="Account and lists" className="flex shrink-0 items-center">
      <ul className="flex items-center gap-0.5">
        <li>
          <HeaderCart />
        </li>
        <HeaderListLinks />
        <li>
          <HeaderAccount />
        </li>
      </ul>
    </nav>
  );
}
