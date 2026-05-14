import { create } from "zustand";

interface CommentSheetState {
  isOpen: boolean;
  postId: string | null;
  postTitle: string | null;
  openSheet: (postId: string, title?: string) => void;
  closeSheet: () => void;
}

export const useCommentSheetStore = create<CommentSheetState>((set) => ({
  isOpen: false,
  postId: null,
  postTitle: null,
  openSheet: (postId, title) =>
    set({ isOpen: true, postId, postTitle: title || null }),
  closeSheet: () => set({ isOpen: false, postId: null, postTitle: null }),
}));
