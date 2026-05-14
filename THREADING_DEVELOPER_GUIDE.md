# 🧵 Threaded Comments - Developer Walkthrough

## Quick Start

### Backend Setup (Already Done)

```javascript
// 1. Comment model now supports threading
Comment {
  parentCommentId: ObjectId,    // null for root
  replyCount: Number,           // Denormalized
  likes: [ObjectId],            // New field
}

// 2. New endpoint: POST /posts/:id/comments/:commentId/like
// 3. Existing endpoint enhanced: POST /posts/:id/comment
//    Now accepts parentCommentId in body

// 4. Response structure changed: GET /posts/:id/comments
//    Returns { replies: [] } nested structure
```

### Mobile Setup (Already Done)

```typescript
// 1. Comment type updated with threading fields
interface Comment {
  parentCommentId?: string | null;
  replyCount?: number;
  likes?: string[];
  replies?: Comment[];
  isExpanded?: boolean;
}

// 2. New API method: likeCommentRequest(postId, commentId)
// 3. Store method: addReply(postId, text, parentCommentId)
// 4. UI component: CommentBottomSheet supports threading
```

## Key Files Changed

### Backend Changes

**1. `/backend/models/Comment.js`**

```javascript
// Added fields:
parentCommentId: { type: ObjectId, ref: "Comment", default: null }
replyCount: { type: Number, default: 0 }
likes: [ObjectId]
reactions: Map

// Added indexes:
{ postId: 1, parentCommentId: 1, createdAt: -1 }
{ parentCommentId: 1, createdAt: -1 }
```

**2. `/backend/controllers/postController.js`**

`commentPost` enhancement:

```javascript
// Check if replying to a comment
if (parentCommentId) {
  const parent = await Comment.findById(parentCommentId);
  // Validate parent exists and belongs to same post
  parent.replyCount += 1;
  await parent.save();
}
// Only root comments increment post.commentCount
if (!parentCommentId) {
  post.commentCount += 1;
}
```

New `likeComment` method:

```javascript
const likeComment = async (postId, commentId, userId) => {
  const comment = await Comment.findById(commentId);

  // Toggle like
  if (comment.likes.includes(userId)) {
    comment.likes.remove(userId);
  } else {
    comment.likes.push(userId);
    // Notify author
    await increaseReputation(comment.userId, ReputationEvents.COMMENT_LIKED);
  }

  await comment.save();
  return { commentId, liked: true / false, likesCount };
};
```

`getPostComments` refactored:

```javascript
// Two-pass algorithm:
// 1. Separate root comments and replies
const roots = comments.filter((c) => !c.parentCommentId);
const replies = comments.filter((c) => c.parentCommentId);

// 2. Build nested structure
const threaded = roots.map((root) => ({
  ...root,
  replies: replies.filter((r) => r.parentCommentId === root._id),
}));

// Returns nested array with replies array on each root
```

**3. `/backend/routes/postRoutes.js`**

```javascript
// Added route:
router.post("/:id/comments/:commentId/like", authMiddleware, likeComment);
```

**4. `/backend/services/reputationService.js`**

```javascript
// Added:
COMMENT_LIKED: 1;
```

### Frontend Changes

**1. `/mobile/src/types/models.ts`**

```typescript
interface Comment {
  _id: string;
  postId: string;
  userId: User;
  text: string;
  createdAt: string;
  // NEW:
  parentCommentId?: string | null;
  replyCount?: number;
  likes?: string[];
  reactions?: Record<string, string[]>;
  replies?: Comment[];
  isExpanded?: boolean;
}
```

**2. `/mobile/src/services/api/postApi.ts`**

```typescript
// New function:
export const commentPostReplyRequest = async (
  postId: string,
  text: string,
  parentCommentId: string,
): Promise<Comment> => {
  return apiClient.post(`/posts/${postId}/comment`, {
    text,
    parentCommentId,
  });
};

// New function:
export const likeCommentRequest = async (
  postId: string,
  commentId: string,
): Promise<{ commentId: string; liked: boolean; likesCount: number }> => {
  return apiClient.post(`/posts/${postId}/comments/${commentId}/like`);
};
```

**3. `/mobile/src/store/feedStore.ts`**

```typescript
// Added interface method:
addReply: (postId: string, text: string, parentCommentId: string) =>
  Promise<Comment>;

// Implementation:
addReply: async (postId, text, parentCommentId) => {
  const reply = await commentPostReplyRequest(postId, text, parentCommentId);
  // Don't increment post count - only parent.replyCount incremented
  return reply;
};
```

**4. `/mobile/src/components/feed/CommentBottomSheet.tsx`** (Complete Rebuild)

New state:

```typescript
const [comments, setComments] = useState<Comment[]>([]);
const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
```

New methods:

```typescript
// Flatten tree for FlatList rendering
const flattenComments = (items: Comment[], depth = 0) => {
  const flattened = [];
  items.forEach((comment) => {
    flattened.push({
      item: comment,
      depth,
      isReply: depth > 0,
      isExpanded: expandedThreads.has(comment._id),
      replyCount: comment.replies?.length ?? 0,
    });

    if (expandedThreads.has(comment._id) && comment.replies?.length) {
      flattened.push(...flattenComments(comment.replies, depth + 1));
    }
  });
  return flattened;
};

// Handle reply submission
const handleSubmit = async () => {
  if (replyTarget) {
    const reply = await addReply(postId, text, replyTarget._id);
    // Update parent comment with new reply
    setComments((prev) =>
      prev.map((c) =>
        c._id === replyTarget._id
          ? {
              ...c,
              replies: [...c.replies, reply],
              replyCount: c.replyCount + 1,
            }
          : c,
      ),
    );
  } else {
    const comment = await addComment(postId, text);
    setComments((prev) => [comment, ...prev]);
  }
};

// Toggle thread visibility
const toggleThreadExpanded = (commentId: string) => {
  setExpandedThreads((prev) => {
    const next = new Set(prev);
    next.has(commentId) ? next.delete(commentId) : next.add(commentId);
    return next;
  });
};

// Like a comment (with optimistic update)
const toggleCommentLike = async (commentId: string) => {
  // Optimistically update UI
  setComments((prev) => updateCommentLikes(prev, commentId, authUser._id));

  try {
    await likeCommentRequest(postId, commentId);
  } catch (error) {
    // Revert on error
    setComments((prev) => revertCommentLikes(prev, commentId, authUser._id));
  }
};
```

Rendering:

```typescript
// renderCommentItem handles:
// - Indentation via marginLeft: depth * 12
// - Thread connector line via View with borderLeft
// - Different styling for replies vs root (lighter bg, smaller text)
// - Expand/collapse button for threads
// - Like button with filled heart when liked
// - Reply button with reply mode activation

const renderItem = ({ item: renderData }) => {
  const { item, depth, isReply, replyCount, isExpanded } = renderData;
  return renderCommentItem(item, depth, isReply, replyCount, isExpanded);
};

// FlatList data structure:
// [
//   { item: rootComment1, depth: 0, replies: 3, isExpanded: true },
//   { item: reply1, depth: 1, parentId: rootComment1._id },
//   { item: reply2, depth: 1, parentId: rootComment1._id },
//   { item: reply3, depth: 1, parentId: rootComment1._id },
//   { item: rootComment2, depth: 0, replies: 1, isExpanded: false },
// ]
```

## Understanding the Flow

### Creating a Root Comment

```
User Input
  ↓
handleSubmit() [no replyTarget]
  ↓
addComment(postId, text)  ← API call
  ↓
POST /posts/:id/comment { text }  ← Backend
  ↓
Comment.create({ postId, userId, text, parentCommentId: null })
  ↓
Post.commentCount += 1
  ↓
Response with populated comment
  ↓
setComments(prev => [newComment, ...prev])
  ↓
FlatList re-renders with new root comment at top
```

### Replying to a Comment

```
User taps "Reply" on comment
  ↓
setReplyTarget(comment)  ← Shows "Replying to..." banner
  ↓
User types reply and taps send
  ↓
handleSubmit() [replyTarget exists]
  ↓
addReply(postId, text, replyTarget._id)  ← API call
  ↓
POST /posts/:id/comment { text, parentCommentId }  ← Backend
  ↓
Comment.create({ postId, userId, text, parentCommentId })
  ↓
Parent.replyCount += 1  ← NOT post.commentCount
  ↓
Response with reply
  ↓
setComments(prev =>
  prev.map(c => c._id === replyTarget._id
    ? { ...c, replies: [...c.replies, reply] }
    : c
  )
)
  ↓
toggleThreadExpanded(replyTarget._id)  ← Auto-expand
  ↓
flattenComments re-runs, includes new reply in tree
  ↓
FlatList re-renders with reply indented under parent
```

### Liking a Comment

```
User taps Heart icon
  ↓
toggleCommentLike(commentId)  ← Optimistic update
  ↓
setComments(prev => updateCommentLikes(...))  ← Fills heart immediately
  ↓
POST /posts/:id/comments/:commentId/like  ← Backend
  ↓
Comment.likes.push(userId) or .remove(userId)
  ↓
If new like: sendNotification + increaseReputation
  ↓
Response: { liked: bool, likesCount }
  ↓
Frontend keeps optimistic state (or reconciles if different)
  ↓
Heart displays as filled red with count
```

## Testing Checklist

- [ ] Create root comment - appears at top
- [ ] Reply to root comment - appears indented under parent
- [ ] Reply shows "View X replies" button
- [ ] Tap "View X replies" - replies expand smoothly
- [ ] Tap "Hide X replies" - replies collapse
- [ ] Like root comment - heart fills red
- [ ] Like reply - heart fills red and indented
- [ ] Like count displays correctly
- [ ] Reply to a reply (if supported) - double indented
- [ ] Scroll through many comments - smooth scrolling
- [ ] Network offline - replies still appear (optimistic)
- [ ] Network reconnects - state reconciles
- [ ] Close and re-open comment sheet - state persists correctly
- [ ] Dark mode - styling applies correctly

## Performance Notes

### Queries

- `GET /posts/:id/comments` - O(n) where n = total comments
  - 2-pass algorithm: filter + build tree
  - Acceptable for 100-500 comments
  - Consider pagination for 1000+

- `POST /posts/:id/comment` - O(1) if no parent, O(1) if parent (by ID)
  - Both optimized with indexes

- `POST /posts/:id/comments/:id/like` - O(1)
  - Simple array push/remove on comment

### Frontend

- `flattenComments` - O(n) where n = total comments visible
  - Runs on expand/collapse
  - Memoized to prevent unnecessary runs
  - Only traverses expanded threads

- `renderItem` - called per visible item
  - Memoized with useCallback
  - Should avoid unnecessary re-renders

### Scaling

- ✅ 50 root comments with 5-10 replies each = smooth
- ⚠️ 500+ root comments = consider pagination
- ⚠️ Comments with 100+ replies = consider "Show more" pattern

## Debugging Tips

### Backend

```bash
# Check if parentCommentId is null for root
db.comments.find({ parentCommentId: null })

# Check if replies are correctly counted
db.comments.findOne({ _id: rootId })  # Should show replyCount
```

### Frontend

```typescript
// Log comment structure
console.log("Comments:", comments);

// Log flattened structure
console.log("Flat:", flatCommentsList);

// Check expanded threads
console.log("Expanded:", expandedThreads);

// Check reply target
console.log("Reply Target:", replyTarget);
```

### Common Issues

1. **Replies not showing**
   - Check: parentCommentId in database
   - Check: replies array in API response
   - Check: expandedThreads includes parent ID

2. **Reply count wrong**
   - Check: Backend incremented correctly
   - Check: Local state updated correctly
   - Check: API response has correct count

3. **Performance lag**
   - Profile: Use React DevTools Profiler
   - Check: Is flattenComments being called too often?
   - Check: Is renderItem memoized?
   - Check: FlatList `removeClippedSubviews` enabled?

## Future Enhancements (Architecture Ready)

1. **Nested replies to replies**
   - Currently stops at depth 1
   - Add depth limit UI pattern to prevent deep nesting

2. **Emoji reactions**
   - Model has `reactions: Map<String, [UserID]>`
   - Add reaction picker UI
   - Implement `/comments/:id/react` endpoint

3. **Comment editing**
   - Add `editedAt` field to model
   - Implement PATCH endpoint
   - Update UI with "edited" label

4. **Threading pagination**
   - Add `limit` query param to API
   - Return "Show more replies" button
   - Lazy load additional replies

5. **Mention system**
   - Parse text for `@username`
   - Store mentions array in model
   - Send notifications to mentioned users

---

Questions? Check THREADED_COMMENTS_GUIDE.md for more details!
