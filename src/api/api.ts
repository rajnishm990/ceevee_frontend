import { request, requestBlob, session, upload } from "./client";
import type {
  CoverLetter,
  CoverLetterInput,
  CoverLetterPatch,
  Profile,
  ProfileInput,
  Section,
  SectionPatch,
  SectionWithVersions,
  User,
  Version,
} from "./types";

interface Tokens {
  access_token: string;
  refresh_token: string;
}

export const api = {
  async register(email: string, password: string) {
    await request<User>("POST", "/auth/register", { email, password });
    return api.login(email, password);
  },
  async login(email: string, password: string) {
    const t = await request<Tokens>("POST", "/auth/login", { email, password });
    session.set(t.access_token, t.refresh_token);
    return api.me();
  },
  me: () => request<User>("GET", "/auth/me"),
  deleteAccount: (password: string) => request<void>("DELETE", "/auth/me", { password }),

  sections: () => request<SectionWithVersions[]>("GET", "/sections"),
  section: (id: number) => request<SectionWithVersions>("GET", `/sections/${id}`),
  createSection: (domain_name: string, gdrive_link?: string) =>
    request<Section>("POST", "/sections", { domain_name, gdrive_link: gdrive_link || null }),
  updateSection: (id: number, patch: SectionPatch) => request<Section>("PATCH", `/sections/${id}`, patch),
  deleteSection: (id: number) => request<void>("DELETE", `/sections/${id}`),
  setActive: (id: number, version_id: number) => request<Section>("POST", `/sections/${id}/active-version`, { version_id }),
  rotateSlug: (id: number) => request<Section>("POST", `/sections/${id}/rotate-slug`),

  uploadVersion(sectionId: number, file: File, label?: string) {
    const form = new FormData();
    form.append("file", file);
    if (label) form.append("label", label);
    return upload<Version>(`/sections/${sectionId}/versions`, form);
  },
  version: (id: number) => request<Version>("GET", `/versions/${id}`),
  saveVersion: (id: number, updated_content: Record<string, string>, base_revision: number) =>
    request<Version>("PATCH", `/versions/${id}`, { updated_content, base_revision }),
  previewVersion: (id: number, updated_content: Record<string, string>) =>
    requestBlob("POST", `/versions/${id}/preview`, { updated_content }),
  setLabel: (id: number, label: string | null) => request<Version>("PATCH", `/versions/${id}/label`, { label }),
  deleteVersion: (id: number) => request<void>("DELETE", `/versions/${id}`),
  versionPdf: (id: number, source: "current" | "original" = "current") =>
    requestBlob("GET", `/versions/${id}/download?source=${source}`),

  profile: () => request<Profile>("GET", "/profile"),
  saveProfile: (p: ProfileInput) => request<Profile>("PUT", "/profile", p),

  coverLetters: () => request<CoverLetter[]>("GET", "/cover-letters"),
  createCoverLetter: (c: CoverLetterInput) => request<CoverLetter>("POST", "/cover-letters", c),
  updateCoverLetter: (id: number, c: CoverLetterPatch) => request<CoverLetter>("PATCH", `/cover-letters/${id}`, c),
  deleteCoverLetter: (id: number) => request<void>("DELETE", `/cover-letters/${id}`),
};

export const publicUrl = (slug: string) => `${window.location.origin}${import.meta.env.VITE_API_BASE ?? ""}/api/v1/public/${slug}`;
