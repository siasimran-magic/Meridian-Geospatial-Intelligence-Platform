"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NearbyPlace, PlaceCategory, PlaceDetails, OpeningStatus } from "@/types/places";

const MapCanvas = dynamic(() => import("@/components/MapCanvas"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="spinner" />Loading map…</div>,
});

type Center = { latitude: number; longitude: number };
type CategoryResponse = { categories: PlaceCategory[] };
type NearbyResponse = { places: NearbyPlace[]; count: number; error?: string };
type DetailsResponse = { place?: PlaceDetails; error?: string };
type SignedInUser = { userId: string; email: string; displayName: string; role: "user" | "admin" };

const initialCenter: Center = { latitude: 12.9716, longitude: 77.5946 };

function formatDistance(distanceM: number) {
  return distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`;
}

function formatHours(time: string | null) {
  return time ? time.slice(0, 5) : "—";
}

function statusLabel(status: OpeningStatus) {
  if (status === "open") return "Open now";
  if (status === "closed") return "Closed";
  return "Hours unknown";
}

function categoryTone(category?: PlaceCategory) {
  if (category?.slug === "restaurant") return "tone-amber";
  if (category?.slug === "cafe") return "tone-rose";
  if (category?.slug === "hospital") return "tone-blue";
  if (category?.slug === "grocery" || category?.slug === "parks") return "tone-green";
  return "tone-slate";
}

function Stars({ rating }: { rating: number | null }) {
  return rating === null ? (
    <span className="rating-muted">No ratings</span>
  ) : (
    <span className="rating-value"><span aria-hidden="true">★</span> {rating.toFixed(1)}</span>
  );
}

function PlaceCard({
  place,
  selected,
  onSelect,
}: {
  place: NearbyPlace;
  selected: boolean;
  onSelect: () => void;
}) {
  const category = place.categories[0];
  return (
    <button className={`place-card${selected ? " place-card--selected" : ""}`} onClick={onSelect}>
      <span className={`place-category-mark ${categoryTone(category)}`} aria-hidden="true">
        {category?.name.slice(0, 1).toUpperCase() ?? "P"}
      </span>
      <span className="place-card-copy">
        <span className="place-card-topline">
          <span className="place-name">{place.name}</span>
          <span className="place-distance">{formatDistance(place.distanceM)}</span>
        </span>
        <span className="place-card-meta">
          <Stars rating={place.averageRating} />
          <span>{place.reviewCount} reviews</span>
        </span>
        <span className="place-card-category">{place.categories.map((item) => item.name).join(" · ") || "Uncategorized"}</span>
        {place.address && <span className="place-card-address">{place.address}</span>}
        <span className={`status-text status-text--${place.openingStatus}`}>
          <i />{statusLabel(place.openingStatus)}
        </span>
      </span>
      <span className="place-card-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function PlaceDetailCard({
  place,
  loading,
  error,
  onClose,
}: {
  place: PlaceDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  if (!loading && !error && !place) return null;

  return (
    <section className="detail-card" aria-live="polite">
      <div className="detail-card-head">
        <span className="eyebrow">PLACE INTELLIGENCE</span>
        <button className="icon-button" aria-label="Close place details" onClick={onClose}>×</button>
      </div>
      {loading && <div className="detail-loading"><span className="spinner" />Loading place details…</div>}
      {error && <p className="inline-error">{error}</p>}
      {place && !loading && (
        <>
          <h2>{place.name}</h2>
          <div className="detail-score-row"><Stars rating={place.averageRating} /><span>{place.reviewCount} published reviews</span></div>
          {place.description && <p className="detail-description">{place.description}</p>}
          {place.address && <p className="detail-address"><span aria-hidden="true">⌖</span>{place.address}</p>}
          <div className="detail-status-row">
            <span className={`status-pill status-pill--${place.openingStatus}`}><i />{statusLabel(place.openingStatus)}</span>
            <span>{place.timeZone}</span>
          </div>
          {place.openingHours.length > 0 && (
            <div className="hours-list">
              <span className="section-label">WEEKLY HOURS</span>
              {Array.from({ length: 7 }, (_, index) => {
                const weekday = index + 1;
                const dayPeriods = place.openingHours.filter((period) => period.weekday === weekday);
                const dayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index];
                const closed = dayPeriods.some((period) => period.isClosed);
                return (
                  <div className="hours-row" key={weekday}>
                    <span>{dayName}</span>
                    <span>{closed ? "Closed" : dayPeriods.map((period) => `${formatHours(period.opensAt)}–${formatHours(period.closesAt)}`).join(", ") || "Not listed"}</span>
                  </div>
                );
              })}
            </div>
          )}
          {!place.hoursKnown && <p className="unknown-hours-note">Opening hours have not been provided.</p>}
          <div className="review-list">
            <div className="review-list-title"><span className="section-label">RECENT REVIEWS</span><span>{place.reviews.length}</span></div>
            {place.reviews.length === 0 ? (
              <p className="muted-copy">No published reviews yet.</p>
            ) : place.reviews.slice(0, 4).map((review) => (
              <article className="review-item" key={review.reviewId}>
                <div className="review-item-top"><strong>{review.authorName ?? "Community member"}</strong><span>★ {review.rating.toFixed(1)}</span></div>
                <p>{review.body ?? "Rating only"}</p>
                <time dateTime={review.createdAt}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(review.createdAt))}</time>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function SpatialSearch() {
  const [center, setCenter] = useState<Center>(initialCenter);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [radiusPreset, setRadiusPreset] = useState("5000");
  const [customRadiusKm, setCustomRadiusKm] = useState("3");
  const [minimumRating, setMinimumRating] = useState("all");
  const [category, setCategory] = useState("all");
  const [openingStatus, setOpeningStatus] = useState("all");
  const [sort, setSort] = useState("distance");
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showCustomRadius, setShowCustomRadius] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);
  const detailRequest = useRef<AbortController | null>(null);

  const radiusM = useMemo(() => {
    if (radiusPreset === "custom") return Number(customRadiusKm) * 1000;
    return Number(radiusPreset);
  }, [customRadiusKm, radiusPreset]);
  const radiusError = !Number.isFinite(radiusM) || radiusM <= 0 || radiusM > 100_000
    ? "Choose a search radius from 0.1 to 100 km."
    : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as CategoryResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load categories.");
        setCategories(data.categories);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCategoryError(error instanceof Error ? error.message : "Could not load categories.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { user?: SignedInUser | null }) => setCurrentUser(body.user ?? null))
      .catch(() => setCurrentUser(null));
    return () => controller.abort();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  };

  useEffect(() => {
    if (radiusError) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(center.latitude),
      longitude: String(center.longitude),
      radius: String(radiusM),
      openingStatus,
      sort,
    });
    if (category !== "all") params.set("category", category);
    if (minimumRating !== "all") params.set("minimumRating", minimumRating);

    const loadingTimer = window.setTimeout(() => {
      setLoading(true);
      setSearchError(null);
    }, 0);
    fetch(`/api/places/nearby?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as NearbyResponse;
        if (!response.ok) throw new Error(data.error ?? "Search could not be completed.");
        setSearchError(null);
        setPlaces(data.places);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError(error instanceof Error ? error.message : "Search could not be completed.");
        setPlaces([]);
      })
      .finally(() => {
        window.clearTimeout(loadingTimer);
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      window.clearTimeout(loadingTimer);
    };
  }, [center.latitude, center.longitude, radiusM, radiusError, category, minimumRating, openingStatus, sort]);

  const selectPlace = useCallback(async (placeId: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedPlaceId(placeId);
    setSelectedPlace(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/places/${placeId}`, { signal: controller.signal });
      const data = (await response.json()) as DetailsResponse;
      if (!response.ok || !data.place) throw new Error(data.error ?? "Could not load place details.");
      setSelectedPlace(data.place);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDetailError(error instanceof Error ? error.message : "Could not load place details.");
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, []);

  const locateMe = () => {
    setGeoMessage(null);
    if (!navigator.geolocation) {
      setGeoMessage("This browser does not support location access.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGeoMessage("Search centered on your current location.");
        setGeoLoading(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. You can still choose a point on the map."
          : error.code === error.TIMEOUT
            ? "Location request timed out. Try again or choose a point on the map."
            : "Your location is unavailable. Choose a point on the map instead.";
        setGeoMessage(message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  const pickLocation = (latitude: number, longitude: number) => {
    setCenter({ latitude, longitude });
    setGeoMessage("Search center updated from the map.");
    setSelectedPlaceId(null);
    setSelectedPlace(null);
  };

  const selectedCoordinates = `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="GeoIntel home">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>GeoIntel</strong><small>PLACE INTELLIGENCE</small></span>
        </Link>
        <div className="topbar-center"><span className="topbar-dot" />SPATIAL EXPLORER <span className="topbar-divider">/</span> BENGALURU DEMO</div>
        <div className="topbar-right"><span className="database-indicator"><i />PostGIS connected</span>{currentUser ? <><span className="auth-greeting">{currentUser.displayName}</span><button className="auth-nav-button" onClick={() => void logout()}>Sign out</button></> : <><Link className="auth-nav-link" href="/login">Sign in</Link><Link className="auth-nav-button" href="/register">Create account</Link></>}</div>
      </header>

      <div className="workspace">
        <aside className="search-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">DISCOVER YOUR AREA</span><h1>Nearby places</h1></div>
            <span className="heading-symbol" aria-hidden="true">⌖</span>
          </div>
          <p className="panel-intro">Explore places around a point, filtered with live spatial and review data.</p>

          <section className="filter-section location-section">
            <div className="section-heading"><span className="filter-number">01</span><label>Search location</label></div>
            <button className="location-button" onClick={locateMe} disabled={geoLoading}>
              <span className="location-button-icon" aria-hidden="true">◎</span>
              <span>{geoLoading ? "Finding your location…" : "Use my current location"}</span>
              <span className="button-arrow" aria-hidden="true">↗</span>
            </button>
            <div className="coordinate-readout"><span className="coordinate-pulse" />CENTER <strong>{selectedCoordinates}</strong></div>
            <p className="microcopy">Click anywhere on the map to move the search center.</p>
            {geoMessage && <p className="helper-message" role="status">{geoMessage}</p>}
          </section>

          <section className="filter-section">
            <div className="section-heading"><span className="filter-number">02</span><label htmlFor="radius">Search radius</label></div>
            <div className="select-wrap"><select id="radius" value={radiusPreset} onChange={(event) => {
              setRadiusPreset(event.target.value);
              setShowCustomRadius(event.target.value === "custom");
            }}>
              <option value="1000">1 kilometer</option>
              <option value="5000">5 kilometers</option>
              <option value="10000">10 kilometers</option>
              <option value="custom">Custom radius</option>
            </select><span aria-hidden="true">⌄</span></div>
            {showCustomRadius && <label className="custom-radius">Custom range <span><input type="number" min="0.1" max="100" step="0.1" value={customRadiusKm} onChange={(event) => setCustomRadiusKm(event.target.value)} /> km</span></label>}
          </section>

          <section className="filter-section">
            <div className="section-heading"><span className="filter-number">03</span><label htmlFor="category">Category</label></div>
            <div className="select-wrap"><select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => <option key={item.categoryId} value={item.slug}>{item.name}</option>)}
            </select><span aria-hidden="true">⌄</span></div>
            {categoryError && <p className="inline-hint">Categories could not be loaded: {categoryError}</p>}
          </section>

          <section className="filter-section">
            <div className="section-heading"><span className="filter-number">04</span><label htmlFor="rating">Minimum rating</label></div>
            <div className="select-wrap"><select id="rating" value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}>
              <option value="all">Any rating</option>
              <option value="3">3.0 and above</option>
              <option value="4">4.0 and above</option>
              <option value="4.5">4.5 and above</option>
            </select><span aria-hidden="true">⌄</span></div>
          </section>

          <section className="filter-section compact-filter">
            <div className="section-heading"><span className="filter-number">05</span><label htmlFor="open-status">Opening status</label></div>
            <div className="select-wrap"><select id="open-status" value={openingStatus} onChange={(event) => setOpeningStatus(event.target.value)}>
              <option value="all">All opening statuses</option>
              <option value="open">Open now</option>
              <option value="closed">Closed</option>
              <option value="unknown">Hours unknown</option>
            </select><span aria-hidden="true">⌄</span></div>
          </section>

          <section className="filter-section sort-section">
            <div className="section-heading"><span className="filter-number">06</span><label htmlFor="sort">Sort results</label></div>
            <div className="select-wrap"><select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="distance">Nearest first</option>
              <option value="rating">Highest rated first</option>
            </select><span aria-hidden="true">⌄</span></div>
          </section>

          <div className="results-header">
            <div><span className="eyebrow">LIVE RESULTS</span><h2>Places around you <span>{loading ? "…" : places.length}</span></h2></div>
            {loading && !radiusError && <span className="spinner spinner--small" aria-label="Searching" />}
          </div>
          {(radiusError || searchError) && <div className="error-banner" role="alert"><strong>{radiusError ? "Invalid search radius" : "Search unavailable"}</strong><span>{radiusError ?? searchError}</span></div>}
          {!radiusError && !searchError && !loading && places.length === 0 && (
            <div className="empty-state"><span aria-hidden="true">⌕</span><strong>No places in this search</strong><p>Try a wider radius or change your filters.</p></div>
          )}
          {!radiusError && places.length > 0 && (
            <div className="place-results" aria-label="Nearby places">
              {places.map((place) => <PlaceCard key={place.placeId} place={place} selected={selectedPlaceId === place.placeId} onSelect={() => void selectPlace(place.placeId)} />)}
            </div>
          )}
          <footer className="panel-footer"><span className="footer-pulse" />LIVE POSTGIS SEARCH <span>·</span> DISTANCE IN METERS</footer>
        </aside>

        <section className="map-stage" aria-label="Interactive map and place results">
          <div className="map-toolbar">
            <div className="map-context"><span className="map-context-icon" aria-hidden="true">⌖</span><span><strong>Map view</strong><small>{places.length} places within {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(radiusM % 1000 ? 1 : 0)} km` : `${Math.round(radiusM)} m`}</small></span></div>
            <div className="map-key"><span><i className="key-dot key-dot--amber" />Food & drink</span><span><i className="key-dot key-dot--blue" />Healthcare</span><span><i className="key-dot key-dot--green" />Outdoors & shops</span></div>
          </div>
          <div className="map-frame">
            <MapCanvas
              center={[center.latitude, center.longitude]}
              places={radiusError ? [] : places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(placeId) => void selectPlace(placeId)}
              onPickLocation={pickLocation}
            />
            <div className="map-hint"><span aria-hidden="true">⌖</span> Click the map to search another area</div>
            <PlaceDetailCard
              place={selectedPlace}
              loading={detailLoading}
              error={detailError}
              onClose={() => { detailRequest.current?.abort(); setSelectedPlaceId(null); setSelectedPlace(null); setDetailError(null); setDetailLoading(false); }}
            />
          </div>
          <div className="map-attribution-note">Map data © OpenStreetMap contributors <span>·</span> Places from PostgreSQL + PostGIS</div>
        </section>
      </div>
    </main>
  );
}
