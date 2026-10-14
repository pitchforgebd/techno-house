/**
 * Product gallery: multi-image upload, and a second Save & publish button
 * (AD-370).
 *
 *   npm run test:product-gallery
 *
 * Before this, "Add gallery images" in Admin -> Products was a single upload
 * box: the product's gallery was always exactly the thumbnail plus at most one
 * more image, because the save path only ever read/wrote one extra
 * `ProductImage` row. Anything beyond that (a direct database edit, say) was
 * invisible in the form and only survived because the old code never touched
 * it. This suite checks:
 *   - `parseProductGalleryImages`, exercised directly with good and bad input;
 *   - the persistence layer writes the WHOLE submitted list (create, update and
 *     clone), only when it was actually submitted;
 *   - the admin form sources its gallery state from every image after the
 *     thumbnail, not just the second one, and submits the array under the new
 *     field name;
 *   - the shared media picker's multi-select mode is strictly additive — every
 *     other caller (thumbnail, banners, category/brand logos, ...) still gets
 *     single-select with no `multiple` prop, so this cannot have changed their
 *     behaviour;
 *   - a Save & publish button exists twice (top and bottom of the form), both
 *     wired to the same submit.
 * No database, no network — the real upload + save flow was driven end to end
 * in headless Chrome when this was built (see AD-370 in project-memory/TASKS.md).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  PRODUCT_GALLERY_IMAGE_MAX,
  parseProductGalleryImages,
} from "../../lib/catalog/gallery-input";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

/** Source text with Windows line endings normalised, so patterns can use a plain newline. */
function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

/** Every .ts/.tsx file under a folder, with forward slashes in the paths. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry).split(String.fromCharCode(92)).join("/");
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
}

/** Text from `marker` up to (not including) the next top-level `export`. */
function section(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const next = text.indexOf("\nexport ", start + marker.length);
  return next < 0 ? text.slice(start) : text.slice(start, next);
}

/** `marker`'s own brace-balanced block, starting at the first `{` after it. */
function functionBody(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const braceStart = text.indexOf("{", start);
  if (braceStart < 0) {
    return "";
  }
  let depth = 0;
  for (let index = braceStart; index < text.length; index += 1) {
    if (text[index] === "{") {
      depth += 1;
    } else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return text.slice(start);
}

function pureRules(): void {
  const ok = parseProductGalleryImages([
    "/uploads/products/a.jpg",
    "https://cdn.example.com/b.png",
  ]);
  check(
    "two good images (local path + https URL) are both kept, in order",
    ok.ok &&
      ok.value?.[0] === "/uploads/products/a.jpg" &&
      ok.value?.[1] === "https://cdn.example.com/b.png",
  );
  const none = parseProductGalleryImages(undefined);
  check("undefined means 'leave the gallery untouched' (not an empty array)", none.ok && none.value === undefined);
  const cleared = parseProductGalleryImages([]);
  check("an empty array is a real, valid value (clears the gallery)", cleared.ok && Array.isArray(cleared.value) && cleared.value.length === 0);
  const withGaps = parseProductGalleryImages(["", "  ", "/uploads/products/a.jpg", ""]);
  check("empty slots are dropped silently, not rejected", withGaps.ok && withGaps.value?.length === 1 && withGaps.value[0] === "/uploads/products/a.jpg");
  const bad = parseProductGalleryImages(["not a path or url"]);
  check("a value that is neither a local path nor an http(s) URL is refused", !bad.ok);
  const traversal = parseProductGalleryImages(["/uploads/../../etc/passwd"]);
  check("a path-traversal attempt is refused", !traversal.ok);
  const backslash = parseProductGalleryImages(["/uploads/products/a" + String.fromCharCode(92) + "b.jpg"]);
  check("a backslash in the path is refused", !backslash.ok);
  const protocolRelative = parseProductGalleryImages(["//evil.example/x.jpg"]);
  check("a protocol-relative URL is refused (it is not a same-site path)", !protocolRelative.ok);
  const wrongScheme = parseProductGalleryImages(["javascript:alert(1)"]);
  check("a non-http(s) scheme is refused", !wrongScheme.ok);
  const atMax = parseProductGalleryImages(Array.from({ length: PRODUCT_GALLERY_IMAGE_MAX }, (_, i) => `/uploads/products/${i}.jpg`));
  check(`exactly the ${PRODUCT_GALLERY_IMAGE_MAX}-image limit is accepted`, atMax.ok && atMax.value?.length === PRODUCT_GALLERY_IMAGE_MAX);
  const overMax = parseProductGalleryImages(Array.from({ length: PRODUCT_GALLERY_IMAGE_MAX + 1 }, (_, i) => `/uploads/products/${i}.jpg`));
  check("one more than the limit is refused outright (not silently truncated)", !overMax.ok);
}

function persistence(): void {
  const lib = source("lib/catalog/admin-products.ts");

  const syncFn = functionBody(lib, "async function syncProductGalleryImages(");
  check("the sync helper exists and deletes only the non-thumbnail rows before recreating them", syncFn.length > 0 && syncFn.includes("isPrimary: false") && syncFn.includes("deleteMany") && syncFn.includes("createMany"));
  check(
    "the delete specifically excludes the thumbnail (isPrimary: false in its own where clause, not just somewhere in the function)",
    syncFn.includes("deleteMany({\n    where: { productId, isPrimary: false },\n  });"),
  );
  check("the sync helper writes positions starting after the thumbnail (position 0)", syncFn.includes("position: index + 1"));
  check("the sync helper never touches isPrimary (the thumbnail stays untouched)", syncFn.length > 0 && !syncFn.includes("isPrimary: true"));

  check(
    "on update, the gallery is only touched when gallerySrcs was actually submitted",
    lib.includes("if (parsed.gallerySrcs !== undefined) {") &&
      lib.includes("syncProductGalleryImages(\n            tx,\n            existing.id,\n            parsed.name,\n            parsed.gallerySrcs,\n          );"),
  );
  check(
    "the old single-row find-or-create gallery logic (position 1 only) is gone",
    !lib.includes("const secondary = await tx.productImage.findFirst({\n            where: { productId: existing.id, isPrimary: false },") &&
      !lib.includes("${parsed.name} gallery`"),
  );

  const createPath = section(lib, "data: {\n          productId: createdRow.id,\n          src: parsed.thumbnailSrc || PLACEHOLDER_IMAGE_SRC,");
  check(
    "on create, the whole submitted gallery is written when there is one",
    createPath.includes("parsed.gallerySrcs !== undefined && parsed.gallerySrcs.length > 0") &&
      createPath.includes("syncProductGalleryImages("),
  );

  const clone = section(lib, "export async function cloneAdminProduct(");
  check(
    "cloning a product carries over EVERY gallery image, not just one",
    clone.includes("const gallerySrcs = source.images\n    .filter((image) => !image.isPrimary)\n    .map((image) => image.src);") &&
      clone.includes("gallerySrcs,\n  };"),
  );

  check("the old singular gallerySrc field is gone from the persistence layer", !lib.includes("gallerySrc,") && !lib.includes("gallerySrc:") && !lib.includes("parsed.gallerySrc)"));
}

function inputTypes(): void {
  const types = source("lib/catalog/product-input.ts");
  check("ProductInputFields carries a gallerySrcs array, not a single gallerySrc", types.includes("gallerySrcs?: string[];") && !types.includes("gallerySrc?: string;"));
  check("ParsedProductInput carries the same", /gallerySrcs\?:\s*string\[\];/.test(types) && !/gallerySrc\?:\s*string \| null;/.test(types));

  const server = source("lib/catalog/product-input-server.ts");
  check(
    "the server parser validates the array with the shared rule and forwards it only when present",
    server.includes('import { parseProductGalleryImages } from "@/lib/catalog/gallery-input";') &&
      server.includes("const gallerySrcs = parseProductGalleryImages(input.gallerySrcs);") &&
      server.includes("...(gallerySrcs.value !== undefined ? { gallerySrcs: gallerySrcs.value } : {}),"),
  );
}

function adminForm(): void {
  const form = source("features/admin/products/admin-product-form.tsx");

  check(
    "the form imports the gallery editor",
    form.includes('import { AdminProductGalleryFields } from "@/features/admin/products/admin-product-gallery-fields";'),
  );
  check(
    "the gallery state starts from EVERY image after the thumbnail, not just image[1]",
    form.includes("(product?.images ?? [])\n      .slice(1)\n      .map((image) => image.src)"),
  );
  check(
    "the gallery editor is wired to that state, and submits it under gallerySrcs",
    form.includes("<AdminProductGalleryFields") &&
      form.includes("images={galleryImages}") &&
      form.includes("onChange={setGalleryImages}") &&
      form.includes("gallerySrcs: galleryImages,"),
  );
  check("the thumbnail box is untouched — still its own single-image upload box", form.includes('label="Add thumbnail image"') && form.includes("value={thumbnailSrc}"));

  // Two Save & publish buttons: one in the header actions, one after the fields.
  const submitButtons = form.match(/type="submit"[\s\S]{0,400}?Save & publish/g) ?? [];
  check("there are two submit buttons both labelled Save & publish (top and bottom)", submitButtons.length === 2);
  check(
    "the top one sits in the header action row, before the field cards start",
    form.indexOf('{pending ? "Saving…" : "Save & publish"}') < form.indexOf("Product basic information"),
  );
  check("the bottom Save & unpublish button (a distinct action) is untouched", form.includes("Save & unpublish"));
}

function mediaPickerMultiSelect(): void {
  const modal = source("features/admin/media/admin-media-picker.tsx");
  check(
    "multiple/onSelectMany are optional props, off by default",
    modal.includes("onSelectMany?: (paths: string[]) => void;") && modal.includes("multiple = false,"),
  );
  check(
    "both places that can add several images (the upload handler and a library click) guard on multiple AND onSelectMany together — the exact guard TypeScript needs to narrow onSelectMany as defined, present at both call sites",
    (modal.match(/if \(multiple && onSelectMany\) \{/g) ?? []).length === 2,
  );
  check("the file input only allows picking several files when multiple is on", modal.includes("multiple={multiple}"));
  check(
    "a library click in multi-select mode adds AND RETURNS before reaching the single-select close-on-click path (otherwise every click still closes the dialog)",
    modal.includes("onSelectMany([item.path]);\n                            setAddedCount((count) => count + 1);\n                            return;"),
  );
  check(
    "the old single-select close-on-click path is still there, for every other caller",
    modal.includes("onSelect?.(item.path);\n                          onClose();"),
  );
  check("a Done button only appears in multi-select mode", modal.includes("{multiple ? (") && modal.includes(">\n              Done\n            </button>"));

  // Every OTHER caller of the modal must still be single-select — this is the
  // actual backward-compatibility guarantee, checked by absence, not just by
  // the default value.
  const callers = sourceFiles("features").filter(
    (path) => !path.endsWith("admin-media-picker.tsx") && !path.endsWith("admin-product-gallery-fields.tsx") && source(path).includes("<AdminMediaPickerModal"),
  );
  const withMultiple = callers.filter((path) => /<AdminMediaPickerModal[\s\S]{0,200}?\bmultiple\b/.test(source(path)));
  check(
    `no caller besides the new gallery editor turns on multiple (found: ${withMultiple.join(", ") || "none"})`,
    withMultiple.length === 0,
  );
  check("AdminFormUploadBox (thumbnail, banners, logos, color images, ...) still opens the picker in plain single-select mode", source("features/admin/products/admin-product-form-primitives.tsx").includes("onSelect={(path) => onChange?.(path)}") && !source("features/admin/products/admin-product-form-primitives.tsx").includes("multiple"));
}

function multiUploadBackend(): void {
  const media = source("lib/media/admin-media.ts");
  check("uploadAdminMediaFiles returns every created path, not just the last one", media.includes("const createdPaths: string[] = [];") && media.includes("createdPaths.push(publicPath);") && media.includes("paths: createdPaths,"));
  check("the old single path field is kept too, so every existing caller is unaffected", media.includes("path: lastPath || undefined,"));

  const actions = source("features/admin/media/media-picker-actions.ts");
  const many = section(actions, "export async function uploadMediaPickerFilesAction(");
  check("the many-files action exists, checks origin and permission, and reads every file under the same form field", many.includes("isSameOriginRequest()") && many.includes("canUpload(session.permissions)") && many.includes('formData.getAll("file")'));
  check("it rejects an empty submission rather than silently succeeding with nothing", many.includes('"Choose at least one image file."'));
  check("the single-file action it sits beside is untouched (still exactly one file, still used by every other caller)", actions.includes('const file = formData.get("file");') && actions.includes("if (!(file instanceof File) || file.size <= 0)"));
}

function galleryFieldsComponent(): void {
  const fields = source("features/admin/products/admin-product-gallery-fields.tsx");
  check(
    "the component caps the gallery at the shared limit (computed from the real merged length, not a stub) and tells the admin when some new images did not fit",
    fields.includes("const overflow = merged.length - PRODUCT_GALLERY_IMAGE_MAX;") &&
      fields.includes("const next = merged.slice(0, PRODUCT_GALLERY_IMAGE_MAX);") &&
      fields.includes("if (overflow > 0) {"),
  );
  check("removing an image only drops that one index", fields.includes("images.filter((_, i) => i !== index)"));
  check("reordering swaps with a neighbour, not a full re-sort", fields.includes("next.splice(index, 1)") && fields.includes("next.splice(target, 0, moved"));
  check("the bulk picker is opened with multiple + onSelectMany", fields.includes("multiple") && fields.includes("onSelectMany={addMany}"));
}

function main(): void {
  pureRules();
  persistence();
  inputTypes();
  adminForm();
  mediaPickerMultiSelect();
  multiUploadBackend();
  galleryFieldsComponent();

  if (failures > 0) {
    console.error(`\nproduct gallery: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`product gallery ok — ${checks} checks`);
}

main();
