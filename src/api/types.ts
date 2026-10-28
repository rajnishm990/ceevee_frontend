import type { components } from "./schema";

type S = components["schemas"];

export type Section = S["SectionResponse"];
export type SectionWithVersions = S["SectionWithVersions"];
export type VersionSummary = S["VersionSummary"];
export type Version = S["ResumeVersionResponse"];
export type User = S["UserResponse"];
export type Profile = S["ProfileResponse"];
export type ProfileInput = S["ProfileData"];
export type CoverLetter = S["CoverLetterResponse"];
export type CoverLetterInput = S["CoverLetterCreate"];
export type CoverLetterPatch = S["CoverLetterUpdate"];
export type SectionPatch = S["SectionUpdate"];

export interface SpanMeta {
  page: number;
  bbox: [number, number, number, number];
  origin: [number, number];
  font: string;
  flags: number;
  size: number;
  color: number;
  text: string;
}

export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}
