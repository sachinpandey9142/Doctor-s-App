import { create } from "zustand";

import { createStoryRequest, getStoryFeedRequest, viewStoryRequest } from "@/services/api/storyApi";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { Story, StoryGroup } from "@/types/models";

interface StoryState {
  groups: StoryGroup[];
  loading: boolean;
  refreshing: boolean;
  fetchStoryFeed: () => Promise<void>;
  refreshStoryFeed: () => Promise<void>;
  createStory: (payload: { mediaUrl: string; type: "image" | "video"; caption?: string; visibility?: "followers" | "public"; }) => Promise<Story>;
  markStoryViewed: (storyId: string) => Promise<Story>;
  clearStories: () => void;
}

const updateGroupsWithStory = (groups: StoryGroup[], updatedStory: Story) =>
  groups.map((group) => {
    const stories = group.stories.map((story) =>
      story._id === updatedStory._id ? updatedStory : story
    );

    const hasUnseen = stories.some((story) => !story.isSeen);

    if (stories.some((story) => story._id === updatedStory._id)) {
      return {
        ...group,
        stories,
        hasUnseen
      };
    }

    return group;
  });

export const useStoryStore = create<StoryState>((set, get) => ({
  groups: [],
  loading: false,
  refreshing: false,

  fetchStoryFeed: async () => {
    set({ loading: true });

    try {
      const groups = await getStoryFeedRequest();
      set({ groups, loading: false });
    } catch (error) {
      set({ loading: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load stories"), "error");
    }
  },

  refreshStoryFeed: async () => {
    set({ refreshing: true });

    try {
      const groups = await getStoryFeedRequest();
      set({ groups, refreshing: false });
    } catch (error) {
      set({ refreshing: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to refresh stories"), "error");
    }
  },

  createStory: async (payload) => {
    const story = await createStoryRequest(payload);
    await get().fetchStoryFeed();
    return story;
  },

  markStoryViewed: async (storyId) => {
    const story = await viewStoryRequest(storyId);

    set((state) => ({
      groups: updateGroupsWithStory(state.groups, story)
    }));

    return story;
  },

  clearStories: () => set({ groups: [], loading: false, refreshing: false })
}));