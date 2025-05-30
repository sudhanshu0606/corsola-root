const REGIONS = [
    "Frankfurt",
    "India/Bombay",
    "Paris",
    "Shanghai",
    "Toronto",
    "United Kingdom",
    "United States"
] as const;

type Regions = typeof REGIONS[number];

export type { Regions };
export { REGIONS };
