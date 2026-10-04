/** Pure video selection shared by the editor, build guard and website. */
export interface MuxVideoAsset {
  status?: string;
  playbackId?: string;
  data?: {
    playback_ids?: {id: string; policy: string}[];
    static_renditions?: {
      files?: {status?: string; name?: string; ext?: string}[];
    };
  };
}

/** Never render an unprocessed, signed or unsafe asset as a public MP4. */
export function muxVideoUrl(asset?: MuxVideoAsset | null): string | null {
  if (asset?.status !== 'ready') return null;
  const id = asset.data?.playback_ids?.find(playback => playback.policy === 'public')?.id;
  if (!id || !/^[a-zA-Z0-9]+$/.test(id)) return null;
  const file = asset.data?.static_renditions?.files?.find(file =>
    file.status === 'ready' && file.ext === 'mp4' && file.name === 'highest.mp4');
  return file ? `https://stream.mux.com/${id}/${file.name}` : null;
}

export interface ClipVideoSources {
  videoMode?: string;
  video?: string | null;
  videoPortrait?: string | null;
  videoMux?: MuxVideoAsset | null;
  videoPortraitMux?: MuxVideoAsset | null;
}

/** Preserve saved legacy uploads, but an empty/new clip always uses Mux. */
export function clipVideoMode(clip?: {videoMode?: string; video?: unknown; videoMux?: unknown} | null): 'mux' | 'file' {
  if (clip?.videoMode === 'file') return 'file';
  if (clip?.videoMode === 'mux' || clip?.videoMux) return 'mux';
  const legacy = clip?.video;
  const saved = typeof legacy === 'string' ? legacy.trim() :
    legacy && typeof legacy === 'object' && 'asset' in legacy &&
    (legacy.asset as { _ref?: string } | undefined)?._ref;
  return saved ? 'file' : 'mux';
}

export function clipVideoSources(clip: ClipVideoSources): {video: string; videoPortrait: string} {
  const automatic = clipVideoMode(clip) === 'mux';
  const video = (automatic ? muxVideoUrl(clip.videoMux) : clip.video) || '';
  const portrait = automatic ? muxVideoUrl(clip.videoPortraitMux) : clip.videoPortrait;
  return {video, videoPortrait: portrait || video};
}
