export const ALLOWED_CITY_CODES = new Set([
  "31.01",
  "31.71",
  "31.72",
  "31.73",
  "31.74",
  "31.75",
  "32.01",
  "32.02",
  "32.03",
  "32.04",
  "32.05",
  "32.11",
  "32.13",
  "32.14",
  "32.15",
  "32.16",
  "32.17",
  "32.71",
  "32.72",
  "32.73",
  "32.75",
  "32.76",
  "32.77",
  "36.01",
  "36.02",
  "36.03",
  "36.04",
  "36.71",
  "36.72",
  "36.73",
  "36.74",
]);

export const ALLOWED_PROVINCE_CODES = new Set(["31", "32", "36"]);

export const SERVICE_AREA =
  "Jawa Barat, DKI Jakarta, dan Banten (Radius 150 km dari Bekasi)";

export function isCityAllowed(code: string): boolean {
  return ALLOWED_CITY_CODES.has(code);
}

export function isProvinceAllowed(code: string): boolean {
  return ALLOWED_PROVINCE_CODES.has(code);
}
