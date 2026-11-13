import type { Store } from '../store';
import * as clips from './clips';

export interface ClipboardApi {
  /** The Clipboard App's Clips: texts the user pasted into it, to copy back later. */
  readonly clips: {
    /** Every Clip, pinned ones first, each group newest first. */
    list(): readonly clips.ListedClip[];
    /**
     * Saves pasted text as a Clip at the top: 'saved', or 'moved' when it was
     * already a Clip. Refuses text that is empty or only whitespace ('empty')
     * or over 100,000 characters ('too-long'), saving nothing. Unpinned Clips
     * beyond the newest 50 are then dropped.
     */
    save(text: string): Promise<clips.SaveResult>;
    /** Pins a Clip, so it is never dropped and is listed first, or unpins it. */
    setPinned(id: string, pinned: boolean): Promise<void>;
    delete(id: string): Promise<void>;
    /** Deletes every Clip that isn't pinned. */
    clearUnpinned(): Promise<void>;
  };
}

export function createClipboard(store: Store): ClipboardApi {
  const { clock } = store;
  const state = store.state;
  const commitClips = (change: (list: readonly clips.Clip[]) => clips.Clip[]) =>
    store.commit({ ...state(), clips: change(state().clips) });

  return {
    clips: {
      list: () => clips.listClips(state().clips, clock.now()),
      async save(text) {
        const refused = clips.refusal(text);
        if (refused) return refused;
        const moved = state().clips.some((clip) => clip.text === text);
        await commitClips((list) =>
          clips.saveClip(list, { id: crypto.randomUUID(), text, savedAt: clock.now().getTime() }),
        );
        return moved ? 'moved' : 'saved';
      },
      setPinned: (id, pinned) => commitClips((list) => clips.setPinned(list, id, pinned)),
      delete: (id) => commitClips((list) => clips.deleteClip(list, id)),
      clearUnpinned: () => commitClips(clips.clearUnpinned),
    },
  };
}
