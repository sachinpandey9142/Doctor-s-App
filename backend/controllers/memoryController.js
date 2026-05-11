const MemoryCollection = require("../models/MemoryCollection");
const MemoryItem = require("../models/MemoryItem");
const Story = require("../models/Story");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const isOwner = (ownerId, viewerId) => String(ownerId) === String(viewerId);

const hasFollowerAccess = (owner, viewerId) =>
  Boolean(owner?.followers?.some((id) => String(id) === String(viewerId)));

const canViewCollection = (collection, viewer, owner) => {
  if (!collection || !viewer) {
    return false;
  }

  if (isOwner(collection.userId, viewer.id)) {
    return true;
  }

  if (collection.visibility === "public") {
    return true;
  }

  if (collection.visibility === "followers") {
    return hasFollowerAccess(owner, viewer.id);
  }

  return false;
};

const canManageCollection = (collection, viewer) =>
  Boolean(collection && viewer && isOwner(collection.userId, viewer.id));

const buildCollectionSummary = (collection, statsById) => {
  const stats = statsById.get(String(collection._id));
  return {
    ...collection,
    itemCount: stats?.itemCount ?? 0,
    latestItemAt: stats?.latestItemAt ?? collection.updatedAt,
  };
};

const getCollectionStats = async (collectionIds) => {
  if (!collectionIds.length) {
    return new Map();
  }

  const stats = await MemoryItem.aggregate([
    {
      $match: {
        collectionId: { $in: collectionIds },
      },
    },
    {
      $group: {
        _id: "$collectionId",
        itemCount: { $sum: 1 },
        latestItemAt: { $max: "$createdAt" },
      },
    },
  ]);

  return new Map(stats.map((entry) => [String(entry._id), entry]));
};

const getNextSortOrder = async (collectionId) => {
  const latestItem = await MemoryItem.findOne({ collectionId })
    .sort({ sortOrder: -1, createdAt: -1 })
    .select("sortOrder")
    .lean();

  return (latestItem?.sortOrder ?? -1) + 1;
};

const loadCollectionForViewer = async (collectionId, viewerId) => {
  const collection = await MemoryCollection.findById(collectionId).lean();

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  const owner = await User.findById(collection.userId)
    .select("followers")
    .lean();
  if (!owner) {
    throw new ApiError(404, "Collection owner not found");
  }

  const viewer = { id: viewerId };
  if (!canViewCollection(collection, viewer, owner)) {
    throw new ApiError(
      403,
      "You do not have permission to view this collection",
    );
  }

  return { collection, owner };
};

// @desc    Get all memory collections for a user
// @route   GET /api/memories/user/:userId
// @access  Private
exports.getCollections = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const owner = await User.findById(userId).select("followers").lean();

    if (!owner) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const viewerId = req.user.id;
    const isSelf = isOwner(userId, viewerId);
    const canSeeFollowerCollections = hasFollowerAccess(owner, viewerId);

    const filter = isSelf
      ? { userId }
      : {
          userId,
          visibility: canSeeFollowerCollections
            ? { $in: ["public", "followers"] }
            : "public",
        };

    const collections = await MemoryCollection.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const statsById = await getCollectionStats(
      collections.map((item) => item._id),
    );

    return res.status(200).json({
      success: true,
      data: collections.map((collection) =>
        buildCollectionSummary(collection, statsById),
      ),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new memory collection
// @route   POST /api/memories
// @access  Private
exports.createCollection = async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const { coverImage, visibility } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Collection title is required" });
    }

    const collection = await MemoryCollection.create({
      userId: req.user.id,
      title,
      coverImage: coverImage || "",
      visibility: visibility || "public",
    });

    res.status(201).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a memory collection
// @route   PATCH /api/memories/:id
// @access  Private
exports.updateCollection = async (req, res, next) => {
  try {
    const { title, coverImage, visibility } = req.body;
    const collection = await MemoryCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collection.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this collection" });
    }

    if (title) collection.title = title;
    if (coverImage !== undefined) collection.coverImage = coverImage;
    if (visibility) collection.visibility = visibility;

    await collection.save();
    res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a memory collection and its items
// @route   DELETE /api/memories/:id
// @access  Private
exports.deleteCollection = async (req, res, next) => {
  try {
    const collection = await MemoryCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collection.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this collection" });
    }

    await MemoryItem.deleteMany({ collectionId: collection._id });
    await collection.deleteOne();

    res.status(200).json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items in a memory collection
// @route   GET /api/memories/:id/items
// @access  Private
exports.getCollectionItems = async (req, res, next) => {
  try {
    const { collection, owner } = await loadCollectionForViewer(
      req.params.id,
      req.user.id,
    );

    const items = await MemoryItem.find({ collectionId: collection._id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: items.map((item) => ({
        ...item,
        canEdit: canManageCollection(collection, req.user),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a memory item directly in a collection
// @route   POST /api/memories/:id/items
// @access  Private
exports.createMemoryItem = async (req, res, next) => {
  try {
    const collection = await MemoryCollection.findById(req.params.id);

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    if (!canManageCollection(collection, req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const mediaUrl = String(req.body.mediaUrl || "").trim();
    const mediaType = String(req.body.mediaType || "").trim();
    const caption = String(req.body.caption || "").trim();
    const storyId = req.body.storyId || null;

    if (!mediaUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Media URL is required" });
    }

    if (!["image", "video"].includes(mediaType)) {
      return res
        .status(400)
        .json({ success: false, message: "Media type must be image or video" });
    }

    const sortOrder = await getNextSortOrder(collection._id);

    const item = await MemoryItem.create({
      collectionId: collection._id,
      storyId,
      mediaUrl,
      mediaType,
      caption,
      sortOrder,
    });

    if (!collection.coverImage && mediaType === "image") {
      collection.coverImage = mediaUrl;
      await collection.save();
    }

    return res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save a story to a memory collection
// @route   POST /api/memories/:id/save-story
// @access  Private
exports.saveStoryToMemory = async (req, res, next) => {
  try {
    const { storyId } = req.body;
    const collectionId = req.params.id;

    const collection = await MemoryCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (collection.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only save your own stories" });
    }

    // Check if it already exists
    const existing = await MemoryItem.findOne({ collectionId, storyId });
    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Story already saved to this collection",
        });
    }

    const sortOrder = await getNextSortOrder(collection._id);

    const item = await MemoryItem.create({
      collectionId,
      storyId,
      mediaUrl: story.mediaUrl,
      mediaType: story.type,
      caption: story.caption,
      sortOrder,
    });

    // Automatically set cover image if collection has none
    if (!collection.coverImage && story.type === "image") {
      collection.coverImage = story.mediaUrl;
      await collection.save();
    }

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a memory item
// @route   PATCH /api/memories/items/:id
// @access  Private
exports.updateMemoryItem = async (req, res, next) => {
  try {
    const item = await MemoryItem.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    const collection = await MemoryCollection.findById(item.collectionId);
    if (!collection || !canManageCollection(collection, req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const caption = req.body.caption;
    const mediaUrl = req.body.mediaUrl;
    const mediaType = req.body.mediaType;
    const sortOrder = req.body.sortOrder;

    if (caption !== undefined) {
      item.caption = String(caption).trim();
    }
    if (mediaUrl !== undefined) {
      item.mediaUrl = String(mediaUrl).trim();
    }
    if (mediaType !== undefined) {
      item.mediaType = String(mediaType).trim();
    }
    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) {
      item.sortOrder = Number(sortOrder);
    }

    await item.save();

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder memory items in a collection
// @route   PATCH /api/memories/:id/items/reorder
// @access  Private
exports.reorderCollectionItems = async (req, res, next) => {
  try {
    const collection = await MemoryCollection.findById(req.params.id);

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    if (!canManageCollection(collection, req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : [];
    if (!itemIds.length) {
      return res
        .status(400)
        .json({ success: false, message: "Item ids are required" });
    }

    const items = await MemoryItem.find({ collectionId: collection._id })
      .select("_id")
      .lean();
    const itemIdSet = new Set(items.map((item) => String(item._id)));
    const allRequestedIdsValid = itemIds.every((itemId) =>
      itemIdSet.has(String(itemId)),
    );

    if (!allRequestedIdsValid) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Item ids must belong to the collection",
        });
    }

    await Promise.all(
      itemIds.map((itemId, index) =>
        MemoryItem.findByIdAndUpdate(itemId, { sortOrder: index }),
      ),
    );

    const updatedItems = await MemoryItem.find({ collectionId: collection._id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: updatedItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a memory item
// @route   DELETE /api/memories/items/:id
// @access  Private
exports.deleteMemoryItem = async (req, res, next) => {
  try {
    const item = await MemoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const collection = await MemoryCollection.findById(item.collectionId);
    if (collection && collection.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await item.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    next(error);
  }
};
