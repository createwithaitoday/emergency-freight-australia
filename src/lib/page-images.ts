export type PageImage = { src: string; alt: string };

/** One photo per published pickup city. The URL segment is `{slug}-{postcode}`. */
const hubImages: Record<string, PageImage> = {
  "sydney-2000": {
    src: "/images/hub-sydney.jpg",
    alt: "Sydney towers and harbour water at blue hour, with a dark van on a wet rooftop.",
  },
  "parramatta-2150": {
    src: "/images/hub-parramatta.jpg",
    alt: "A riverside road in Parramatta at dusk, with mid-rise offices and a dark van.",
  },
  "newcastle-2300": {
    src: "/images/hub-newcastle.jpg",
    alt: "A dark van on a Newcastle waterfront road, with port cranes and the coast beyond.",
  },
  "wollongong-2500": {
    src: "/images/hub-wollongong.jpg",
    alt: "A dark van on a coastal industrial road, with the Illawarra escarpment and the Pacific.",
  },
  "gosford-2250": {
    src: "/images/hub-gosford.jpg",
    alt: "A dark van on a quiet commercial street beside Brisbane Water at Gosford.",
  },
  "brisbane-4000": {
    src: "/images/hub-brisbane.jpg",
    alt: "A dark van on a Brisbane riverside road at blue hour, with the Story Bridge beyond.",
  },
  "southport-4215": {
    src: "/images/hub-southport.jpg",
    alt: "A dark van on a Gold Coast waterfront road at sunset, with towers across the broadwater.",
  },
  "townsville-4810": {
    src: "/images/hub-townsville.jpg",
    alt: "A dark van on a tropical industrial road, with Castle Hill and the Townsville coast.",
  },
  "cairns-4870": {
    src: "/images/hub-cairns.jpg",
    alt: "A dark van on a palm-lined waterfront road at Cairns in late light.",
  },
  "toowoomba-4350": {
    src: "/images/hub-toowoomba.jpg",
    alt: "A dark van on a wide main street in Toowoomba under morning haze.",
  },
  "melbourne-3000": {
    src: "/images/hub-melbourne.jpg",
    alt: "A dark van beside the Yarra at evening, with Melbourne towers and tram tracks.",
  },
  "geelong-3220": {
    src: "/images/hub-geelong.jpg",
    alt: "A dark van on a Geelong waterfront road, with Corio Bay and distant silos.",
  },
  "ballarat-3350": {
    src: "/images/hub-ballarat.jpg",
    alt: "A dark van beside brick warehouses on a wide Ballarat street under an overcast sky.",
  },
  "bendigo-3550": {
    src: "/images/hub-bendigo.jpg",
    alt: "A dark van on a Bendigo commercial road, with a mine headframe in the distance.",
  },
  "dandenong-3175": {
    src: "/images/hub-dandenong.jpg",
    alt: "A dark van at a Dandenong factory loading dock, with the ranges on the horizon.",
  },
};

export const stateImages: Record<string, PageImage> = {
  nsw: {
    src: "/images/coverage-nsw.jpg",
    alt: "A dark van on a harbour road at dusk, with port cranes lit across the water.",
  },
  qld: {
    src: "/images/coverage-qld.jpg",
    alt: "A dark van on a riverside road at dusk, with the Story Bridge and Brisbane towers behind.",
  },
  vic: {
    src: "/images/coverage-vic.jpg",
    alt: "A dark van on wet tram tracks beside the Yarra, with Melbourne towers and a spire at blue hour.",
  },
};

export function imageForPlace(place: string): PageImage | null {
  return hubImages[place] ?? null;
}

export function imageForHub(name: string, postcode: string): PageImage | null {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return hubImages[`${slug}-${postcode}`] ?? null;
}
