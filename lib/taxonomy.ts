export const SEGMENT_GROUPS = [
  "Virtual / AI Character",
  "Commercial Lifestyle",
  "Creator Entrepreneur",
  "AI-native Creator",
  "Tech/SaaS UGC",
  "Other",
] as const;

export type SegmentGroup = (typeof SEGMENT_GROUPS)[number];

export function getSegmentGroup(segment: string): SegmentGroup {
  const value = segment.toLowerCase();

  if (/(virtual|vtuber|ai character)/.test(value)) return "Virtual / AI Character";
  if (/(lifestyle|fitness|beauty|fashion|food|wellness)/.test(value)) {
    return "Commercial Lifestyle";
  }
  if (value.includes("creator entrepreneur")) return "Creator Entrepreneur";
  if (value.includes("ai-native")) return "AI-native Creator";
  if (/(tech|saas|ugc)/.test(value)) return "Tech/SaaS UGC";
  return "Other";
}
