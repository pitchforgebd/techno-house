# PC Builder — staff guide

For shop staff who add products and look after the PC Builder. No technical
knowledge needed.

## How it works

Customers build a PC by picking parts one at a time. After they pick, say, a
motherboard, the builder only suggests RAM, CPUs and cases that **fit that
motherboard**. To know what fits, it reads **compatibility data** stored on
each product (socket, RAM type, board size, drive type, wattage).

**A part with no compatibility data is hidden from customers in the builder.**
So filling in the data is what makes a part appear. The product is still on the
shop either way — only the PC Builder hides it.

**The builder only offers parts that are in stock, and only desktop parts.**
This is automatic — there is nothing to switch on:

- A part that is **out of stock** does not appear. It comes back the moment its
  stock is above zero (the picker reads live stock on every visit).
- A **laptop part** never appears, even if it has a slot and data: SO-DIMM /
  "Laptop RAM", anything filed under a laptop category, and parts whose name says
  "Laptop" or "Notebook" without also saying Desktop / PC / Computer (so
  "SSD for Desktop & Laptop" still shows). If a desktop part is wrongly hidden
  because its name says "Laptop", add "Desktop" or "PC" to the product name.
- A customer who already picked a part that later went out of stock keeps it in
  their build; it is shown with an "Out of stock" badge and "Add to cart" is
  blocked until they swap it for another part.

## What each part needs

| Part | Fill in |
|---|---|
| CPU | Socket (e.g. AM5) and wattage (TDP) |
| CPU cooler | Every socket it can mount on |
| Motherboard | Socket, RAM type(s), board size. Drive types are optional |
| RAM | RAM type (DDR4 / DDR5) |
| Graphics card (GPU) | Power draw in watts |
| Power supply (PSU) | Rated watts |
| Case | Every motherboard size it holds |
| SSD / HDD | Drive type (NVMe / SATA) |

Monitors, keyboards, mice, speakers, headphones, UPS and antivirus need
nothing — customers can always pick them.

**A part can support more than one value — tick all that apply.** A board that
takes both DDR4 and DDR5, a cooler that fits AM4, AM5 and LGA1700, a case that
holds ATX and Micro-ATX boards. If a value is not in the list, type it in the
"Other" box (separate several with commas).

## Adding a new product

1. Admin → Products → Add product.
2. Choose the category. The **PC Builder slot is filled in for you** — check it
   in the "PC Builder" card. If the product is not a PC part,
   choose "Not a builder part".
3. In the same card, tick the compatibility values for that part.
4. Save. The part now appears in the builder.

## After a bulk import

Imported products are placed in the right PC Builder slot automatically, but
have no compatibility data yet. Then:

1. Admin → PC Builder → **Compatibility data**.
2. Choose the slot (e.g. Motherboard) from the cards at the top.
3. Press **Auto-fill from product names**. It reads what the product name
   already says (AM5, DDR5, "650 Watt", NVMe …) and fills **only empty values**
   — it never overwrites anything, and it skips a name that is unclear.
4. The parts still marked **Missing** need you. Use **Edit** on a row, or tick
   several parts that share the same value and fill it in once with the bulk
   panel ("Only fill parts that are empty" is the safe choice).
5. Repeat for the other slots.

## The Compatibility data page

- **Cards** show how many parts are ready in each slot ("7 of 41 ready").
- **Show: Needs data** lists what customers cannot see yet. **Ready** lists
  finished parts. **Search** by name or SKU.
- **Edit** opens the tick boxes for that part. **Save** applies immediately.
- The **unlink** button takes a wrongly categorised item (for example a phone
  charger sitting in the Power supply slot) out of the PC Builder. It stays in
  the shop.
- Only **active** products are listed — inactive products never appear in the
  builder. Activate a product first, then fill in its data.

## If customers say they cannot find a part

1. Find the product in Compatibility data (search its name).
2. If it shows **Missing**, fill it in — it appears straight away.
3. If the data is filled in but the part still does not appear for one
   customer's build, it is probably **not compatible** with something they
   already picked. Customers can choose "Show them anyway" under the list.

## Good to know

- Wrong data means wrong suggestions. If you are not sure, leave it empty — an
  empty part is only hidden; a wrong value recommends something that will not
  fit.
- Every change here is recorded in the audit log against your login.
- You need the **Manage PC builder** permission to open the Compatibility data
  page.
