const router = require('express').Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { notify } = require('../utils/notify');

// Like/Unlike post
router.put('/:id/like', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await db.getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const hasLiked = await db.hasUserLikedPost(postId, req.user.id);
    if (hasLiked) {
      await db.unlikePost(postId, req.user.id);
    } else {
      await db.likePost(postId, req.user.id);
    }

    const updatedPost = await db.getPostById(postId);
    const liked = await db.hasUserLikedPost(postId, req.user.id);
    const comments = await db.getPostComments(postId);

    // Notify post owner of like (only for likes, not unlikes, and not self-likes)
    if (!hasLiked && post.userId !== req.user.id) {
      try {
        const io = req.app.get('io');
        if (io) {
          await notify(io, { userId: post.userId, type: 'post_liked', title: 'Post Liked', message: `${req.user.name} liked your post`, relatedId: post.id, relatedType: 'post' });
        }
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr);
      }
    }
    res.json({ ...updatedPost, liked, comments });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like/unlike post' });
  }
});

// Add comment
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await db.getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await db.addPostComment(postId, {
      userId: req.user.id,
      userName: req.user.name,
      text: req.body.text
    });

    // Notify post owner of new comment (not self-comments)
    if (post.userId !== req.user.id) {
      try {
        const io = req.app.get('io');
        if (io) {
          await notify(io, { userId: post.userId, type: 'post_commented', title: 'New Comment', message: `${req.user.name} commented on your post`, relatedId: post.id, relatedType: 'post' });
        }
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr);
      }
    }
    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete post
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const post = await db.getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (req.user.role !== 'admin' && post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own posts' });
    }

    await db.deletePost(post.id);
    await db.addLog('Post Deleted', `Post deleted by ${req.user.name}`, 'warning');
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
