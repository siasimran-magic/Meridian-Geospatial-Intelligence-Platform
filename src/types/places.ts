export type OpeningStatus = "open" | "closed" | "unknown";

export type PlaceCategory = {
  categoryId: string;
  name: string;
  slug: string;
};

export type WeeklyHoursPeriod = {
  weekday: number;
  periodNo: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type PlaceGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type NearbyPlace = {
  placeId: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  geometry: PlaceGeometry;
  distanceM: number;
  averageRating: number | null;
  reviewCount: number;
  categories: PlaceCategory[];
  openingStatus: OpeningStatus;
  hoursKnown: boolean;
  openingHours: WeeklyHoursPeriod[];
};

export type PlaceReview = {
  reviewId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  authorName: string | null;
};

export type PlaceDetails = NearbyPlace & {
  phone: string | null;
  websiteUrl: string | null;
  timeZone: string;
  reviews: PlaceReview[];
};
