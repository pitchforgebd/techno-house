"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveBackblazeSettings,
  saveCacheSettings,
  saveLocalStorageSettings,
  saveS3Settings,
  type FilesystemMutationResult,
} from "@/lib/storage/filesystem-config";

function revalidateFilesystem() {
  revalidatePath("/admin/settings/filesystem");
}

async function actor() {
  const allowed = await staffWithPermission("filesystem.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true as const,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

export async function saveLocalStorageAction(input: {
  localActive: boolean;
}): Promise<FilesystemMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await actor();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await saveLocalStorageSettings({
    ...input,
    actor: allowed.actor,
  });
  if (result.ok) {
    revalidateFilesystem();
  }
  return result;
}

export async function saveS3SettingsAction(input: {
  s3Active: boolean;
  s3Key: string;
  s3Secret: string;
  s3Region: string;
  s3Bucket: string;
}): Promise<FilesystemMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await actor();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await saveS3Settings({ ...input, actor: allowed.actor });
  if (result.ok) {
    revalidateFilesystem();
  }
  return result;
}

export async function saveBackblazeSettingsAction(input: {
  backblazeActive: boolean;
  backblazeKeyId: string;
  backblazeApplicationKey: string;
  backblazeBucket: string;
  backblazeRegion: string;
}): Promise<FilesystemMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await actor();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await saveBackblazeSettings({
    ...input,
    actor: allowed.actor,
  });
  if (result.ok) {
    revalidateFilesystem();
  }
  return result;
}

export async function saveCacheSettingsAction(input: {
  cacheDriver: string;
  sessionDriver: string;
  redisHost: string;
  redisPort: string;
  redisPassword: string;
}): Promise<FilesystemMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await actor();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await saveCacheSettings({ ...input, actor: allowed.actor });
  if (result.ok) {
    revalidateFilesystem();
  }
  return result;
}
