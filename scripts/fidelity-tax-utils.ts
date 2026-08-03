export type TaxCategory = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

export function categoryFor(name: string): TaxCategory {
  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (value.includes("new jersey")) return "nj";
  if (value.includes("new york")) return "ny";
  if (value.includes("california")) return "ca";
  if (value.includes("massachusetts")) return "ma";
  if (value.includes("tax exempt")) return "nm";
  if (value.includes("treasury only")) return "t";
  if (value.includes("treasury")) return "t";
  if (value.includes("government")) return "g";
  return "p";
}
