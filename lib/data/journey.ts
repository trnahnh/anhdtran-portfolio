/**
 * The route here, shared by the Flight Log on /profile and the terminal's
 * `traceroute`. Every school is in Hue; Hanoi is where childhood happened
 * before them.
 */

export interface Place {
  city: string;
  region: string;
  /** IATA code of the city's airport, used as the leg's callsign. */
  code: string;
  /** Lowercase host for the terminal's traceroute. */
  host: string;
  lat: number;
  lon: number;
}

export const PLACES = {
  hue: { city: "Hue", region: "Vietnam", code: "HUI", host: "hue.vn", lat: 16.4637, lon: 107.5909 },
  hanoi: { city: "Hanoi", region: "Vietnam", code: "HAN", host: "hanoi.vn", lat: 21.0285, lon: 105.8542 },
  cincinnati: { city: "Cincinnati", region: "Ohio", code: "CVG", host: "cincinnati.us", lat: 39.1031, lon: -84.512 },
} satisfies Record<string, Place>;

export interface Leg {
  place: Place;
  /** What the leg is: a school, or the role the city plays. */
  title: string;
  /** "2012 → 2017", or a word for the legs without dates. */
  when: string;
  /** Short form for the terminal, where the arrow costs width. */
  span: string;
  /** Pin style on the globe: where it starts, where it grew up, or a stop. */
  kind: "origin" | "childhood" | "stop" | "now";
}

export const LEGS: Leg[] = [
  { place: PLACES.hue, title: "City of origin", when: "Origin", span: "origin", kind: "origin" },
  { place: PLACES.hanoi, title: "City of childhood", when: "Childhood", span: "childhood", kind: "childhood" },
  { place: PLACES.hue, title: "Tran Quoc Toan Elementary School", when: "2012 → 2017", span: "2012-2017", kind: "stop" },
  { place: PLACES.hue, title: "Nguyen Tri Phuong Junior High School", when: "2017 → 2021", span: "2017-2021", kind: "stop" },
  { place: PLACES.hue, title: "Quoc Hoc Hue High School for the Gifted", when: "2021 → 2024", span: "2021-2024", kind: "stop" },
  { place: PLACES.cincinnati, title: "University of Cincinnati", when: "2024 → Now", span: "2024-now", kind: "now" },
];

/**
 * When the Cincinnati leg's clock starts. The first day of UC's fall 2024
 * semester, standing in for the actual landing date. Midnight on Cincinnati's
 * wall clock, as a UTC-encoded wall time: compare it against Cincinnati's
 * wall clock, not Date.now(), so the readout steps with daylight saving the
 * way the rail's clock does and reads the same in every visitor's timezone.
 */
export const ARRIVED_TZ = "America/New_York";
export const ARRIVED_WALL = Date.UTC(2024, 7, 26);

export interface Sport {
  name: string;
  /** The school leg the team belonged to. */
  school: Leg;
  /** What it's played on, drawn on the card. */
  surface: "track" | "court" | "badminton" | "pool";
  /**
   * The plate colour nearest that surface: tartan track red, hardwood
   * yellow, badminton mat green, pool blue.
   */
  plate: 25 | 20 | 15 | 10;
}

const NGUYEN_TRI_PHUONG = LEGS[3];
const QUOC_HOC = LEGS[4];

/** Every one was the school's selective team. */
export const SQUAD = "Selective team";

export const VARSITY: Sport[] = [
  { name: "Track & Field", school: QUOC_HOC, surface: "track", plate: 25 },
  { name: "Basketball", school: QUOC_HOC, surface: "court", plate: 15 },
  { name: "Badminton", school: NGUYEN_TRI_PHUONG, surface: "badminton", plate: 10 },
  { name: "Swimming", school: QUOC_HOC, surface: "pool", plate: 20 },
];
