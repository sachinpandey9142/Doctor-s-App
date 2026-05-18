import { create } from "zustand";
import { getPollRequest, castVoteRequest } from "@/services/api/pollApi";
import type { DiagnosisPoll } from "@/types/models";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import { getSocket } from "@/services/socket/socketClient";

interface PollState {
  polls: Record<string, DiagnosisPoll>;
  loading: Record<string, boolean>;
  fetchPoll: (postId: string) => Promise<void>;
  castVote: (postId: string, optionId: string) => Promise<void>;
  updatePollState: (postId: string, poll: DiagnosisPoll) => void;
  joinPollSync: (postId: string) => void;
  leavePollSync: (postId: string) => void;
}

export const usePollStore = create<PollState>((set, get) => ({
  polls: {},
  loading: {},

  fetchPoll: async (postId: string) => {
    set((state) => ({ loading: { ...state.loading, [postId]: true } }));
    try {
      const poll = await getPollRequest(postId);
      set((state) => ({
        polls: { ...state.polls, [postId]: poll },
        loading: { ...state.loading, [postId]: false },
      }));
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [postId]: false } }));
      // Error fetching poll (might not exist yet), safe to ignore UI wise
      console.log("Failed to load poll", error);
    }
  },

  castVote: async (postId: string, optionId: string) => {
    const currentPoll = get().polls[postId];
    if (!currentPoll) return;

    // Optimistic update
    const previousVoteId = currentPoll.votedOptionId;
    if (previousVoteId === optionId) return; // Same vote

    const optimisticPoll = { ...currentPoll, votedOptionId: optionId };
    
    // Adjust vote counts optimistically
    optimisticPoll.options = optimisticPoll.options.map((opt) => {
      let count = opt.voteCount;
      if (opt._id === previousVoteId) count = Math.max(0, count - 1);
      if (opt._id === optionId) count += 1;
      return { ...opt, voteCount: count };
    });
    
    if (!previousVoteId) {
      optimisticPoll.totalVotes += 1;
    }

    // Recalculate percentages
    optimisticPoll.options = optimisticPoll.options.map((opt) => {
      const pct = optimisticPoll.totalVotes > 0 ? Math.round((opt.voteCount / optimisticPoll.totalVotes) * 100) : 0;
      return { ...opt, pct };
    });

    set((state) => ({
      polls: { ...state.polls, [postId]: optimisticPoll },
    }));

    try {
      const updatedPoll = await castVoteRequest(postId, optionId);
      set((state) => ({
        polls: { ...state.polls, [postId]: updatedPoll },
      }));
    } catch (error) {
      // Rollback
      set((state) => ({
        polls: { ...state.polls, [postId]: currentPoll },
      }));
      useToastStore
        .getState()
        .showToast(extractErrorMessage(error, "Failed to cast vote"), "error");
    }
  },

  updatePollState: (postId: string, poll: DiagnosisPoll) => {
    set((state) => ({
      polls: { ...state.polls, [postId]: poll },
    }));
  },

  joinPollSync: (postId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("joinPoll", { postId });
      // Remove any existing listener to prevent duplicates
      socket.off("pollVoteUpdate");
      socket.on("pollVoteUpdate", (payload: { postId: string; poll: DiagnosisPoll }) => {
        if (payload.postId && payload.poll) {
          get().updatePollState(payload.postId, payload.poll);
        }
      });
    }
  },

  leavePollSync: (postId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit("leavePoll", { postId });
      socket.off("pollVoteUpdate");
    }
  }
}));
