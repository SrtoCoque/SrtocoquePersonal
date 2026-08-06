const LOGO_BASE = "https://image.tmdb.org/t/p/w45";

/** Paths TMDB (ES) + alias comunes de nombres legacy guardados como texto. */
const PROVIDER_LOGO_PATHS: Record<string, string> = {
  netflix: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
  netflixstandardwithads: "/dpR8r13zWDeUR0QkzWidrdMxa56.jpg",
  amazonprimevideo: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  amazonprimevideowithads: "/8aBqoNeGGr0oSA85iopgNZUOTOc.jpg",
  primevideo: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  amazonprime: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  disneyplus: "/97yvRBw1GzX7fXprcF80er19ot.jpg",
  disney: "/97yvRBw1GzX7fXprcF80er19ot.jpg",
  hbomax: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  max: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  hbo: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  hbomaxamazonchannel: "/embS4GPK7c8pjbuY2O2irV5rYch.jpg",
  appletv: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg",
  appletvstore: "/SPnB1qiCkYfirS2it3hZORwGVn.jpg",
  appletvplus: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg",
  movistarplus: "/jse4MOi92Jgetym7nbXFZZBI6LK.jpg",
  movistar: "/jse4MOi92Jgetym7nbXFZZBI6LK.jpg",
  movistarplusficcintotal: "/f6TRLB3H4jDpFEZ0z2KWSSvu1SB.jpg",
  skyshowtime: "/h0ZYcYHicKQ4Ixm5nOjqvwni5NG.jpg",
  filmin: "/kO2SWXvDCHAquaUuTJBuZkTBAuU.jpg",
  filminplus: "/ozZU2vSlyL11rFGEkq1HE0yxIJq.jpg",
  atresplayer: "/zXlrphHQ0EiLTYZcDdVtDxmsjk5.jpg",
  rakutentv: "/bZvc9dXrXNly7cA0V4D9pR8yJwm.jpg",
  googleplaymovies: "/8z7rC8uIDaTM91X0ZfkRf04ydj2.jpg",
  googleplay: "/8z7rC8uIDaTM91X0ZfkRf04ydj2.jpg",
  flixole: "/ozMgkAAoi6aDI5ce8KKA2k8TGvB.jpg",
  flixol: "/ozMgkAAoi6aDI5ce8KKA2k8TGvB.jpg",
  mubi: "/x570VpH2C9EKDf1riP83rYc5dnL.jpg",
  crunchyroll: "/fzN5Jok5Ig1eJ7gyNGoMhnLSCfh.jpg",
  youtubepremium: "/rMb93u1tBeErSYLv79zSTR07UdO.jpg",
  youtube: "/rMb93u1tBeErSYLv79zSTR07UdO.jpg",
  plex: "/vLZKlXUNDcZR7ilvfY9Wr9k80FZ.jpg",
  rtve: "/ywOjT3Mxu71tJgwdoTPhmcAGf2B.jpg",
  plutotv: "/dB8G41Q6tSL5NBisrIeqByfepBc.jpg",
  fubotv: "/9BgaNQRMDvVlji1JBZi6tcfxpKx.jpg",
  filmbox: "/fbveJTcro9Xw2KuPIIoPPePHiwy.jpg",
};

function normalizeProviderKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "");
}

/** Resuelve logo TMDB para nombres legacy (solo texto) o JSON sin logo. */
export function resolveMovieProviderLogo(
  name: string,
  existingLogoUrl?: string | null,
): string | null {
  if (existingLogoUrl) return existingLogoUrl;
  const path = PROVIDER_LOGO_PATHS[normalizeProviderKey(name)];
  return path ? `${LOGO_BASE}${path}` : null;
}
