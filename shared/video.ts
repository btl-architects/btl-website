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

/* MP4 files Mux can prepare, in the order each screen prefers them. Uploads
 * now ask for 1080p, 720p and 480p (a source is never upscaled, so a small
 * upload gets only what it can fill); assets prepared earlier carry
 * `highest.mp4`. Phones take 720p: 1080-pixel frames are stored as 1088 with a
 * crop, which some Android decoders apply inconsistently (a visible rescale and
 * shift), and 720p is also a lighter decode for a phone-sized picture. */
export const MUX_DESKTOP_FILES = ['1080p.mp4', 'highest.mp4', '720p.mp4', '480p.mp4'];
export const MUX_PHONE_FILES = ['720p.mp4', '1080p.mp4', 'highest.mp4', '480p.mp4'];

/** The public playback ID of a ready asset, or null. */
export function muxPlaybackId(asset?: MuxVideoAsset | null): string | null {
  if (asset?.status !== 'ready') return null;
  const id = asset.data?.playback_ids?.find(playback => playback.policy === 'public')?.id;
  return id && /^[a-zA-Z0-9]+$/.test(id) ? id : null;
}

/** Never render an unprocessed, signed or unsafe asset as a public MP4. */
export function muxVideoUrl(asset?: MuxVideoAsset | null, prefer: readonly string[] = MUX_DESKTOP_FILES): string | null {
  const id = muxPlaybackId(asset);
  if (!id) return null;
  const ready = new Set((asset?.data?.static_renditions?.files || [])
    .filter(file => file.status === 'ready' && file.ext === 'mp4').map(file => file.name));
  const name = prefer.find(candidate => ready.has(candidate));
  return name ? `https://stream.mux.com/${id}/${name}` : null;
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
  // Phones use the portrait cut when there is one, otherwise the landscape
  // film; either way the phone-sized file Mux prepared for it.
  const portrait = automatic
    ? muxVideoUrl(clip.videoPortraitMux, MUX_PHONE_FILES) || muxVideoUrl(clip.videoMux, MUX_PHONE_FILES)
    : clip.videoPortrait;
  return {video, videoPortrait: portrait || video};
}
