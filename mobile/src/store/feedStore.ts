import { create } from "zustand";

import {
  commentPostRequest,
  createPostRequest,
  getCasePosts,
  getFeedPosts,
  likePostRequest,
  deletePostRequest,
} from "@/services/api/postApi";
import { commentPostReplyRequest } from "@/services/api/postApi";
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
  addReply: (
    postId: string,
    text: string,
    parentCommentId: string,
  ) => Promise<Comment>;
  deletePost: (postId: string) => Promise<void>;
}

const mergeUniquePosts = (existing: Post[], incoming: Post[]) => {
  const byId = new Map<string, Post>();
  [...existing, ...incoming].forEach((item) => byId.set(item._id, item));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

/** Apply an optimistic like/unlike mutation to a post array */
const applyLikeMutation = (
  posts: Post[],
  postId: string,
  authUserId: string,
  liked: boolean,
): Post[] =>
  posts.map((post) => {
    if (post._id !== postId) return post;
    const withoutSelf = post.likes.filter((id) => id !== authUserId);
    return {
      ...post,
      likes: liked ? [...withoutSelf, authUserId] : withoutSelf,
    };
  });

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
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      useToastStore
        .getState()
        .showToast(extractErrorMessage(error, "Failed to load feed"), "error");
    }
  },

  fetchMoreFeed: async () => {
    const { page, hasMore, loading } = get();
    if (!hasMore || loading) return;

    set({ loading: true });

    try {
      const nextPage = page + 1;
      const response = await getFeedPosts(nextPage, 10);

      set((state) => ({
        posts: mergeUniquePosts(state.posts, response.data),
        page: nextPage,
        hasMore: nextPage < Number(response.pagination?.totalPages || 1),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to load more posts"),
          "error",
        );
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
        refreshing: false,
      });
    } catch (error) {
      set({ refreshing: false });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to refresh feed"),
          "error",
        );
    }
  },

  fetchCaseFeed: async () => {
    try {
      const response = await getCasePosts(1, 25);
      set({ casePosts: response.data });
    } catch (error) {
      set({ casePosts: [] });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to load case discussions"),
          "error",
        );
    }
  },

  createPost: async (payload) => {
    const created = await createPostRequest(payload);

    set((state) => ({
      posts: [created, ...state.posts],
      casePosts:
        created.type === "case"
          ? [created, ...state.casePosts]
          : state.casePosts,
    }));
  },

  /**
   * Optimistic like/unlike:
   * 1. Snapshot the current liked state
   * 2. Apply the mutation immediately (instant UI)
   * 3. Fire the API call
   * 4. If the server disagrees with the optimistic result, reconcile
   * 5. On network error, roll back to snapshot and show a toast
   */
  toggleLike: async (postId) => {
    const authUserId = useAuthStore.getState().user?._id;
    if (!authUserId) return;

    const { posts, casePosts } = get();

    // Snapshot: remember the current liked state for this post
    const targetPost =
      posts.find((p) => p._id === postId) ??
      casePosts.find((p) => p._id === postId);
    if (!targetPost) return;

    const wasLiked = targetPost.likes.includes(authUserId);
    const optimisticLiked = !wasLiked;

    // ── Instant optimistic update ──────────────────────────────────────────
    set((state) => ({
      posts: applyLikeMutation(
        state.posts,
        postId,
        authUserId,
        optimisticLiked,
      ),
      casePosts: applyLikeMutation(
        state.casePosts,
        postId,
        authUserId,
        optimisticLiked,
      ),
    }));

    try {
      const { liked: serverLiked } = await likePostRequest(postId);

      // Reconcile if server result differs from optimistic assumption
      if (serverLiked !== optimisticLiked) {
        set((state) => ({
          posts: applyLikeMutation(
            state.posts,
            postId,
            authUserId,
            serverLiked,
          ),
          casePosts: applyLikeMutation(
            state.casePosts,
            postId,
            authUserId,
            serverLiked,
          ),
        }));
      }
    } catch (error) {
      // ── Roll back to snapshot state ──────────────────────────────────────
      set((state) => ({
        posts: applyLikeMutation(state.posts, postId, authUserId, wasLiked),
        casePosts: applyLikeMutation(
          state.casePosts,
          postId,
          authUserId,
          wasLiked,
        ),
      }));
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to update like"),
          "error",
        );
    }
  },

  addComment: async (postId, text) => {
    const comment = await commentPostRequest(postId, text);

    const mutatePost = (post: Post) =>
      post._id === postId
        ? { ...post, commentCount: post.commentCount + 1 }
        : post;

    set((state) => ({
      posts: state.posts.map(mutatePost),
      casePosts: state.casePosts.map(mutatePost),
    }));

    return comment;
  },

  addReply: async (postId, text, parentCommentId) => {
    const reply = await commentPostReplyRequest(postId, text, parentCommentId);
    // Replies don't increment post comment count (only parent replyCount increments on backend)
    return reply;
  },

  deletePost: async (postId) => {
    // Optimistic delete
    const { posts, casePosts } = get();
    set({
      posts: posts.filter((p) => p._id !== postId),
      casePosts: casePosts.filter((p) => p._id !== postId),
    });

    try {
      await deletePostRequest(postId);
      useToastStore
        .getState()
        .showToast("Post deleted successfully", "success");
    } catch (error) {
      // Revert if failed
      set({ posts, casePosts });
      useToastStore
        .getState()
        .showToast(
          extractErrorMessage(error, "Failed to delete post"),
          "error",
        );
    }
  },
}));
