export interface DeviceModel {
  brand: string;
  brandHandle: string;
  model: string;
  modelHandle: string;
  /** Combined tag handle: "{brandHandle}__{modelHandle}" */
  handle: string;
  imageUrl?: string;
}

export interface BrandGroup {
  brand: string;
  brandHandle: string;
  models: DeviceModel[];
}

export const DEVICE_SEED_DATA: DeviceModel[] = [
  // Apple
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Ultra 2", modelHandle: "apple_watch_ultra_2", handle: "apple__apple_watch_ultra_2" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Ultra", modelHandle: "apple_watch_ultra", handle: "apple__apple_watch_ultra" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Series 10", modelHandle: "apple_watch_series_10", handle: "apple__apple_watch_series_10" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Series 9", modelHandle: "apple_watch_series_9", handle: "apple__apple_watch_series_9" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Series 8", modelHandle: "apple_watch_series_8", handle: "apple__apple_watch_series_8" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch Series 7", modelHandle: "apple_watch_series_7", handle: "apple__apple_watch_series_7" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch SE (2nd generation)", modelHandle: "apple_watch_se_2nd", handle: "apple__apple_watch_se_2nd" },
  { brand: "Apple", brandHandle: "apple", model: "Apple Watch SE (1st generation)", modelHandle: "apple_watch_se_1st", handle: "apple__apple_watch_se_1st" },

  // Samsung
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 7", modelHandle: "galaxy_watch_7", handle: "samsung__galaxy_watch_7" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 6 Classic", modelHandle: "galaxy_watch_6_classic", handle: "samsung__galaxy_watch_6_classic" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 6", modelHandle: "galaxy_watch_6", handle: "samsung__galaxy_watch_6" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 5 Pro", modelHandle: "galaxy_watch_5_pro", handle: "samsung__galaxy_watch_5_pro" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 5", modelHandle: "galaxy_watch_5", handle: "samsung__galaxy_watch_5" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 4 Classic", modelHandle: "galaxy_watch_4_classic", handle: "samsung__galaxy_watch_4_classic" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch 4", modelHandle: "galaxy_watch_4", handle: "samsung__galaxy_watch_4" },
  { brand: "Samsung", brandHandle: "samsung", model: "Galaxy Watch FE", modelHandle: "galaxy_watch_fe", handle: "samsung__galaxy_watch_fe" },

  // Garmin
  { brand: "Garmin", brandHandle: "garmin", model: "Fenix 7 Pro", modelHandle: "fenix_7_pro", handle: "garmin__fenix_7_pro" },
  { brand: "Garmin", brandHandle: "garmin", model: "Fenix 7", modelHandle: "fenix_7", handle: "garmin__fenix_7" },
  { brand: "Garmin", brandHandle: "garmin", model: "Fenix 6 Pro", modelHandle: "fenix_6_pro", handle: "garmin__fenix_6_pro" },
  { brand: "Garmin", brandHandle: "garmin", model: "Forerunner 965", modelHandle: "forerunner_965", handle: "garmin__forerunner_965" },
  { brand: "Garmin", brandHandle: "garmin", model: "Forerunner 955", modelHandle: "forerunner_955", handle: "garmin__forerunner_955" },
  { brand: "Garmin", brandHandle: "garmin", model: "Forerunner 265", modelHandle: "forerunner_265", handle: "garmin__forerunner_265" },
  { brand: "Garmin", brandHandle: "garmin", model: "Venu 3", modelHandle: "venu_3", handle: "garmin__venu_3" },
  { brand: "Garmin", brandHandle: "garmin", model: "Venu 2 Plus", modelHandle: "venu_2_plus", handle: "garmin__venu_2_plus" },
  { brand: "Garmin", brandHandle: "garmin", model: "Vivoactive 5", modelHandle: "vivoactive_5", handle: "garmin__vivoactive_5" },
  { brand: "Garmin", brandHandle: "garmin", model: "Epix Pro", modelHandle: "epix_pro", handle: "garmin__epix_pro" },

  // Fitbit
  { brand: "Fitbit", brandHandle: "fitbit", model: "Versa 4", modelHandle: "versa_4", handle: "fitbit__versa_4" },
  { brand: "Fitbit", brandHandle: "fitbit", model: "Versa 3", modelHandle: "versa_3", handle: "fitbit__versa_3" },
  { brand: "Fitbit", brandHandle: "fitbit", model: "Sense 2", modelHandle: "sense_2", handle: "fitbit__sense_2" },
  { brand: "Fitbit", brandHandle: "fitbit", model: "Sense", modelHandle: "sense", handle: "fitbit__sense" },
  { brand: "Fitbit", brandHandle: "fitbit", model: "Charge 6", modelHandle: "charge_6", handle: "fitbit__charge_6" },
  { brand: "Fitbit", brandHandle: "fitbit", model: "Charge 5", modelHandle: "charge_5", handle: "fitbit__charge_5" },

  // Google
  { brand: "Google", brandHandle: "google", model: "Pixel Watch 3", modelHandle: "pixel_watch_3", handle: "google__pixel_watch_3" },
  { brand: "Google", brandHandle: "google", model: "Pixel Watch 2", modelHandle: "pixel_watch_2", handle: "google__pixel_watch_2" },
  { brand: "Google", brandHandle: "google", model: "Pixel Watch", modelHandle: "pixel_watch", handle: "google__pixel_watch" },

  // Fossil
  { brand: "Fossil", brandHandle: "fossil", model: "Gen 6", modelHandle: "gen_6", handle: "fossil__gen_6" },
  { brand: "Fossil", brandHandle: "fossil", model: "Gen 5", modelHandle: "gen_5", handle: "fossil__gen_5" },
  { brand: "Fossil", brandHandle: "fossil", model: "Sport", modelHandle: "sport", handle: "fossil__sport" },

  // Amazfit
  { brand: "Amazfit", brandHandle: "amazfit", model: "GTR 4", modelHandle: "gtr_4", handle: "amazfit__gtr_4" },
  { brand: "Amazfit", brandHandle: "amazfit", model: "GTS 4", modelHandle: "gts_4", handle: "amazfit__gts_4" },
  { brand: "Amazfit", brandHandle: "amazfit", model: "T-Rex Ultra", modelHandle: "t_rex_ultra", handle: "amazfit__t_rex_ultra" },
  { brand: "Amazfit", brandHandle: "amazfit", model: "Bip 5", modelHandle: "bip_5", handle: "amazfit__bip_5" },
  { brand: "Amazfit", brandHandle: "amazfit", model: "Balance", modelHandle: "balance", handle: "amazfit__balance" },

  // OnePlus
  { brand: "OnePlus", brandHandle: "oneplus", model: "Watch 2", modelHandle: "watch_2", handle: "oneplus__watch_2" },
  { brand: "OnePlus", brandHandle: "oneplus", model: "Watch", modelHandle: "watch", handle: "oneplus__watch" },

  // Polar
  { brand: "Polar", brandHandle: "polar", model: "Vantage V3", modelHandle: "vantage_v3", handle: "polar__vantage_v3" },
  { brand: "Polar", brandHandle: "polar", model: "Vantage V2", modelHandle: "vantage_v2", handle: "polar__vantage_v2" },
  { brand: "Polar", brandHandle: "polar", model: "Grit X2 Pro", modelHandle: "grit_x2_pro", handle: "polar__grit_x2_pro" },
  { brand: "Polar", brandHandle: "polar", model: "Pacer Pro", modelHandle: "pacer_pro", handle: "polar__pacer_pro" },
  { brand: "Polar", brandHandle: "polar", model: "Ignite 3", modelHandle: "ignite_3", handle: "polar__ignite_3" },
];

export function groupByBrand(devices: DeviceModel[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  for (const d of devices) {
    if (!map.has(d.brandHandle)) {
      map.set(d.brandHandle, { brand: d.brand, brandHandle: d.brandHandle, models: [] });
    }
    map.get(d.brandHandle)!.models.push(d);
  }
  return Array.from(map.values()).sort((a, b) => a.brand.localeCompare(b.brand));
}
