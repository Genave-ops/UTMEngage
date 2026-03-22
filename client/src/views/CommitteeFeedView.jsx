import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, Image as ImageIcon, Send, MoreHorizontal, Flag, Trash2 } from 'lucide-react';
import { Card, Button, LoadingSpinner, EmptyState } from '../components/UI';
import ReportContentModal from '../components/ReportContentModal';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI } from '../services/api';

const CommitteeFeedView = ({ committee, onBack }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (committee?.id) {
      fetchPosts();
    }
  }, [committee?.id]);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postsAPI.getByCommittee(committee.id);
      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostText.trim() && !newPostImage) return;

    setSubmitting(true);
    try {
      const postData = {
        content: newPostText,
        image: imagePreview // In production, upload to cloud storage first
      };

      const response = await postsAPI.create(committee.id, postData);
      setPosts(prev => {
        const newPost = response.data;
        const filtered = prev.filter(p => p.id !== newPost.id);
        return [newPost, ...filtered];
      });
      setNewPostText('');
      setNewPostImage(null);
      setImagePreview(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await postsAPI.like(postId);
      setPosts(posts.map(post =>
        post.id === postId ? { ...post, liked: response.data.liked, likesCount: response.data.likesCount } : post
      ));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to like post');
    }
  };

  const handleComment = async (postId, commentText) => {
    if (!commentText.trim()) return;

    try {
      const response = await postsAPI.addComment(postId, commentText);
      setPosts(posts.map(post =>
        post.id === postId ? { ...post, comments: [...(post.comments || []), response.data] } : post
      ));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add comment');
    }
  };

  const handleReport = (post) => {
    setReportingPost(post);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete post');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if user is a member or admin
  const isMember = committee?.isMember || false;
  const isAdmin = user?.role === 'admin';
  const canAccessFeed = isMember || isAdmin;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{committee.name}</h2>
            <p className="text-gray-500 text-sm">Discussion Board</p>
          </div>
        </div>
      </div>

      {/* Members Only Notice */}
      {!canAccessFeed && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Members Only</h3>
            <p className="text-gray-600 mb-4">
              You need to be a committee member to view and participate in discussions.
            </p>
            <Button onClick={onBack}>Return to Committee Details</Button>
          </div>
        </Card>
      )}

      {/* Create Post */}
      {canAccessFeed && (
        <Card>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-utm-blue to-utm-cyan flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share your thoughts with the committee..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none transition-all resize-none"
              />

              {imagePreview && (
                <div className="mt-3 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg" />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setNewPostImage(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <label className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                <Button
                  onClick={handlePostSubmit}
                  disabled={submitting || (!newPostText.trim() && !newPostImage)}
                  className="px-6"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Posts Feed */}
      {canAccessFeed && (
        <>
          {error ? (
            <Card className="border-red-200 bg-red-50">
              <div className="flex items-center justify-between text-red-800">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchPosts}>Retry</Button>
              </div>
            </Card>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No posts yet"
              description="Be the first to start a discussion!"
            />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  onLike={handleLike}
                  onComment={handleComment}
                  onReport={() => handleReport(post)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      {reportingPost && (
        <ReportContentModal
          isOpen={!!reportingPost}
          onClose={() => setReportingPost(null)}
          contentType="post"
          contentId={reportingPost.id}
          contentPreview={reportingPost.content}
          contentAuthorId={reportingPost.userId || reportingPost.authorId}
          contentAuthorName={reportingPost.user || reportingPost.authorName}
        />
      )}
    </div>
  );
};

// Post Card Component
const PostCard = ({ post, currentUser, onLike, onComment, onReport, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  const handleShare = () => {
    const text = `${post.user}: ${post.content}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Post content copied to clipboard');
      });
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const postAuthor = post.user || post.userName || 'Unknown';
  const postTime = post.time || post.createdAt;

  return (
    <Card className="hover-lift">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {post.avatar ? (
            <img src={post.avatar} alt={postAuthor} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold">
              {postAuthor.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{postAuthor}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{post.role}</span>
              <span>•</span>
              <span>{getRelativeTime(postTime)}</span>
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreHorizontal size={18} className="text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
              {(currentUser?.role === 'admin' || post.userId === currentUser?.id) && (
                <button
                  onClick={() => {
                    onDelete(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              )}
              {post.userId !== currentUser?.id && (
                <button
                  onClick={() => {
                    onReport();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Flag size={16} /> Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="mb-4">
          <img
            src={post.image}
            alt="Post content"
            className="w-full rounded-lg max-h-96 object-cover"
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            post.liked
              ? 'text-red-600 bg-red-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Heart size={18} fill={post.liked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">{post.likesCount || post.likes?.length || 0}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-sm font-medium">{post.comments?.length || 0}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Share2 size={18} />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Existing Comments */}
          {post.comments?.map((comment, idx) => {
            const commentAuthor = comment.userName || comment.user || 'Unknown';
            return (
              <div key={comment.id || idx} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {commentAuthor.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold text-sm text-gray-900">{commentAuthor}</p>
                  <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                </div>
              </div>
            );
          })}

          {/* Add Comment */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-utm-blue to-utm-cyan flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className="p-2 bg-utm-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CommitteeFeedView;
