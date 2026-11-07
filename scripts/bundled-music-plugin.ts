import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// Opt-in per build. Only the approved manifest's files enter a static package;
// no source paths, old batch, or unrelated Downloads files are copied.
export function bundledMusicPlugin(): Plugin {
  return {
    name: 'thursday-bundled-music', apply: 'build',
    generateBundle() {
      const source = process.env.FOUNDPHONE_BUNDLED_MUSIC_DIR || 'assets/music';
      const root = path.resolve(source);
      const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
      if (!Array.isArray(manifest.tracks) || manifest.tracks.length !== 24)
        throw Error('Expected the confirmed 24-track music batch');
      const files = new Set<string>();
      const tracks = manifest.tracks.map((track: Record<string, unknown>) => {
        if (typeof track.id !== 'string' || !/^thu-[a-f0-9]{12}$/.test(track.id) ||
            track.file !== track.id + '.mp3' || typeof track.title !== 'string' ||
            typeof track.artist !== 'string') throw Error('Invalid bundled track');
        files.add(track.file as string);
        const row: Record<string, unknown> = { id: track.id, title: track.title, artist: track.artist, file: track.file };
        if (track.coverFile) {
          if (typeof track.coverFile !== 'string' || !/^cover-[a-f0-9]{12}\.jpg$/.test(track.coverFile)) throw Error('Invalid cover');
          row.coverFile = track.coverFile; files.add(track.coverFile);
        }
        return row;
      });
      if (files.size < 24) throw Error('Duplicate bundled music files');
      for (const file of files) this.emitFile({ type: 'asset', fileName: 'music/' + file, source: readFileSync(path.join(root, file)) });
      this.emitFile({ type: 'asset', fileName: 'music/manifest.json', source: JSON.stringify({
        version: manifest.version, tracks, retiredIds: manifest.retiredIds || [], retiredHashes: manifest.retiredHashes || [],
      }) });
    },
  };
}
