import { create } from "zustand";

import {
  commentPostRequest,
  createPostRequest,
  getCasePosts,
  getFeedPosts,
  likePostRequest
} from "@/services/api/postApi";
import { useAuthStore } from "@/store/authStore";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { Comment, Post } from "@/types/models";

interface FeedState {
  posts: Post[];
  casePosts: Post[];
  loading: boolean;
  refreshing: boolean;
  page: number;
  hasMore: boolean;
  fetchInitialFeed: () => Promise<void>;
  fetchMoreFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  fetchCaseFeed: () => Promise<void>;
  createPost: (payload: {
    content: string;
    mediaUrl?: string;
    type?: "text" | "image" | "video" | "case";
    symptoms?: string;
    observations?: string;
    reportImages?: string[];
    isAnonymous?: boolean;
  }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<Comment>;
}

const mergeUniquePosts = (existing: Post[], incoming: Post[]) => {
  const byId = new Map<string, Post>();
  [...existing, ...incoming].forEach((item) => byId.set(item._id, item));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  casePosts: [],
  loading: false,
  refreshing: false,
  page: 1,
  hasMore: true,

  fetchInitialFeed: async () => {
    set({ loading: true });

    try {
      const response = await getFeedPosts(1, 10);
      set({
        posts: response.data,
        page: 1,
        hasMore: Number(response.pagination?.totalPages || 1) > 1,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load feed"), "error");
    }
  },

  fetchMoreFeed: async () => {
    const { page, hasMore, loading } = get();
    if (!hasMore || loading) {
      return;
    }

    set({ loading: true });

    try {
      const nextPage = page + 1;
      const response = await getFeedPosts(nextPage, 10);

      set((state) => ({
        posts: mergeUniquePosts(state.posts, response.data),
        page: nextPage,
        hasMore: nextPage < Number(response.pagination?.totalPages || 1),
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load more posts"), "error");
    }
  },

  refreshFeed: async () => {
    set({ refreshing: true });

    try {
      const response = await getFeedPosts(1, 10);
      set({
        posts: response.data,
        page: 1,
        hasMore: Number(response.pagination?.totalPages || 1) > 1,
        refreshing: false
      });
    } catch (error) {
      set({ refreshing: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to refresh feed"), "error");
    }
  },

  fetchCaseFeed: async () => {
    try {
      const response = await getCasePosts(1, 25);
      set({ casePosts: response.data });
    } catch (error) {
      set({ casePosts: [] });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load case discussions"), "error");
    }
  },

  createPost: async (payload) => {
    // Let the error bubble up to the screen so it can show its own UI feedback
    const created = await createPostRequest(payload);

    set((state) => ({
      posts: [created, ...state.posts],
      casePosts: created.type === "case" ? [created, ...state.casePosts] : state.casePosts
    }));
  },

  toggleLike: async (postId) => {
    const authUserId = useAuthStore.getState().user?._id;
    if (!authUserId) {
      return;
    }

    try {
      const { liked } = await likePostRequest(postId);

      const mutatePost = (post: Post) => {
        if (post._id !== postId) {
          return post;
        }

        const currentLikes = post.likes.filter((id) => id !== authUserId);
        const likes = liked ? Array.from(new Set([...currentLikes, authUserId])) : currentLikes;

        return { ...post, likes };
      };

      set((state) => ({
        posts: state.posts.map(mutatePost),
        casePosts: state.casePosts.map(mutatePost)
      }));
    } catch (error) {
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to update like"), "error");
    }
  },

  addComment: async (postId, text) => {
    // Let errors bubble up so CommentsScreen can show UI feedback
    const comment = await commentPostRequest(postId, text);

    const mutatePost = (post: Post) =>
      post._id === postId ? { ...post, commentCount: post.commentCount + 1 } : post;

    set((state) => ({
      posts: state.posts.map(mutatePost),
      casePosts: state.casePosts.map(mutatePost)
    }));

    return comment;
  }
}));
