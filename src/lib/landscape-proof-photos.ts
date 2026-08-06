/**

 * Matched commercial landscaping before/after photo pairs for demo proof.

 * Local assets under /public/proof — same job type / place feel for each pair.

 */



export type LandscapeProofPair = {

  id: string;

  beforeLabel: string;

  afterLabel: string;

  beforeImage: string;

  afterImage: string;

};



const asset = (name: string) => `/proof/${name}`;



export const LANDSCAPE_PROOF_PAIRS: LandscapeProofPair[] = [

  {

    id: "lawn-mow",

    beforeLabel: "Unmowed front lawn",

    afterLabel: "Freshly mowed & edged lawn",

    beforeImage: asset("lawn-mow-before.png"),

    afterImage: asset("lawn-mow-after.png"),

  },

  {

    id: "flower-bed",

    beforeLabel: "Dry bare flower bed",

    afterLabel: "Planted & mulched flower bed",

    beforeImage: asset("flower-bed-before.png"),

    afterImage: asset("flower-bed-after.png"),

  },

  {

    id: "leaf-cleanup",

    beforeLabel: "Leaves covering walkway & lawn",

    afterLabel: "Leaves blown — clean grounds",

    beforeImage: asset("leaf-cleanup-before.png"),

    afterImage: asset("leaf-cleanup-after.png"),

  },

  {

    id: "hedge-trim",

    beforeLabel: "Overgrown hedge line",

    afterLabel: "Trimmed & shaped hedges",

    beforeImage: asset("hedge-trim-before.png"),

    afterImage: asset("hedge-trim-after.png"),

  },

  {

    id: "mulch-bed",

    beforeLabel: "Weedy bed along frontage",

    afterLabel: "Fresh mulch & edged bed",

    beforeImage: asset("mulch-bed-before.png"),

    afterImage: asset("mulch-bed-after.png"),

  },

  {

    id: "sod-install",

    beforeLabel: "Patchy thin turf",

    afterLabel: "New sod / dense green lawn",

    beforeImage: asset("sod-install-before.png"),

    afterImage: asset("sod-install-after.png"),

  },

];



const CONCERN_IMAGE = asset("concern-dry-patch.png");



export function landscapePairByIndex(index: number): LandscapeProofPair {

  const pairs = LANDSCAPE_PROOF_PAIRS;

  return pairs[((index % pairs.length) + pairs.length) % pairs.length]!;

}



export function landscapePairById(id: string): LandscapeProofPair {

  return (

    LANDSCAPE_PROOF_PAIRS.find((p) => p.id === id) ?? LANDSCAPE_PROOF_PAIRS[0]!

  );

}



/** One matched before/after pair for a visit (arrays keep index alignment). */

export function demoPhotosFromPair(

  pair: LandscapeProofPair,

  secondary?: LandscapeProofPair

): { before: string[]; after: string[] } {

  if (!secondary || secondary.id === pair.id) {

    return {

      before: [pair.beforeImage],

      after: [pair.afterImage],

    };

  }

  return {

    before: [pair.beforeImage, secondary.beforeImage],

    after: [pair.afterImage, secondary.afterImage],

  };

}



export function demoConcernImage(): string {

  return CONCERN_IMAGE;

}



/** True when saved photos are old remote demos (not user uploads). */

export function looksLikeStaleDemoPhotos(photos: {

  before: string[];

  after: string[];

}): boolean {

  const urls = [...photos.before, ...photos.after];

  if (urls.length === 0) return false;

  return urls.every(

    (u) =>

      u.startsWith("/proof/") ||

      u.includes("images.unsplash.com") ||

      u.includes("plus.unsplash.com")

  );

}


