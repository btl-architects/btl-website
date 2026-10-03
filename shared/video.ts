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

export function clipVideoSources(clip: ClipVideoSources): {video: string; videoPortrait: string} {
  // Existing clips have no mode and keep their original, prepared sources.
  const video = (clip.videoMode === 'mux' ? muxVideoUrl(clip.videoMux) : clip.video) || '';
  const portrait = clip.videoMode === 'mux' ? muxVideoUrl(clip.videoPortraitMux) : clip.videoPortrait;
  return {video, videoPortrait: portrait || video};
}
