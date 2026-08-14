import { create } from 'zustand';

interface PreloaderStore {
  rendererReady: boolean;
  assetsReady: boolean;
  setRendererReady: () => void;
  setAssetsReady: () => void;
}

/** Tracks whether the renderer (canvas/Pixi/etc.) and game assets have finished loading. */
export const usePreloader = create<PreloaderStore>((set) => ({
  rendererReady: false,
  assetsReady: false,
  setRendererReady: () => set({ rendererReady: true }),
  setAssetsReady: () => set({ assetsReady: true }),
}));
