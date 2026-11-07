export type AuthorTrack = { id: string; title: string; artist: string; media: string; cover?: string };
export type AuthorMusicManifest = { version: string; tracks: AuthorTrack[]; retiredIds: string[]; retiredHashes: string[] };
export function authorMusicManifest(input: unknown, mediaBase = '/__author_music/'): AuthorMusicManifest {
  const r = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    version: typeof r.version === 'string' ? r.version : '',
    tracks: authorMusicCatalogue(input, mediaBase),
    retiredIds: Array.isArray(r.retiredIds) ? r.retiredIds.filter((x): x is string => typeof x === 'string' && /^thu-[a-f0-9]{12}$/.test(x)) : [],
    retiredHashes: Array.isArray(r.retiredHashes) ? r.retiredHashes.filter((x): x is string => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)) : [],
  };
}

// Only the explicitly prepared catalogue (local service or bundled files); never derive titles from
// misleading download names or import source-machine paths into player saves.
export function authorMusicCatalogue(input: unknown, mediaBase = '/__author_music/'): AuthorTrack[] {
  if (!input || typeof input !== 'object' || !('tracks' in input) || !Array.isArray(input.tracks)) return [];
  const seen = new Set<string>();
  return input.tracks.flatMap((t: unknown) => {
    if (!t || typeof t !== 'object') return [];
    const r = t as Record<string, unknown>;
    if (typeof r.id !== 'string' || !/^thu-[a-f0-9]{12}$/.test(r.id) || seen.has(r.id) || typeof r.title !== 'string' || !r.title.trim() || typeof r.artist !== 'string' || !r.artist.trim() || typeof r.file !== 'string' || !/^thu-[a-f0-9]{12}\.mp3$/.test(r.file)) return [];
    seen.add(r.id);
    const cover = typeof r.coverFile === 'string' && /^cover-[a-f0-9]{12}\.jpg$/.test(r.coverFile) ? mediaBase + r.coverFile : undefined;
    return [{ id: r.id, title: r.title, artist: r.artist, media: mediaBase + r.file, cover }];
  });
}
